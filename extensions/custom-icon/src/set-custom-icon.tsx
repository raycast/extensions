import { Form, ActionPanel, Action, showToast, Toast, environment, Icon, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useMemo } from "react";
import { join } from "path";
import { IconPreview, ApplyIconResult } from "./components/IconPreview";
import { BackgroundType, FormValues } from "./type";
import { GRADIENT_PRESETS, SOLID_COLORS, NO_EMOJI } from "./utils/constants";
import { isValidColor } from "./utils/color-utils";
import {
  confirmAppRestart,
  isAppRunning,
  isValidIconFile,
  isValidImageFile,
  getValidIconExtensions,
  getTargetType,
  TargetType,
} from "./utils/app-utils";
import { BackgroundOptions } from "./components/BackgroundOptions";
import { getCuratedEmojis, extractEmojiImage } from "./utils/emoji-utils";
import { buildBackgroundConfig } from "./utils/background-config";
import { useIconApply } from "./hooks/useIconApply";

export default function Command() {
  const { push, pop } = useNavigation();
  const { isLoading, applyIcon } = useIconApply();

  // Path to default folder icon
  const folderIconPath = join(environment.assetsPath, "default-icon.png");

  // Path to emoji spritesheet
  const emojiSpritesheetPath = join(environment.assetsPath, "emoji-sheet-64.png");

  // Load curated emoji list
  const curatedEmojis = useMemo(() => getCuratedEmojis(), []);

  // Form with validation
  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    initialValues: {
      restartApp: true,
      addBackground: false,
      backgroundType: "solid",
      solidColor: SOLID_COLORS[0].value,
      gradientPreset: GRADIENT_PRESETS[0].value,
      useFolderIcon: false,
      preserveImageDetails: true,
      selectedEmoji: NO_EMOJI,
    },
    validation: {
      targetApp: FormValidation.Required,
      iconFile: (value) => {
        // Skip validation if emoji is selected
        if (values.selectedEmoji && values.selectedEmoji !== NO_EMOJI) {
          return;
        }
        // Require icon file when no emoji selected
        if (!value || value.length === 0) {
          return "Select an icon file or pick an emoji";
        }
        // Validate file type
        if (!isValidIconFile(value[0])) {
          return `Invalid file type. Supported: ${getValidIconExtensions()}`;
        }
      },
      customColor: (value) => {
        // Only validate when custom color background is selected
        if (values.backgroundType !== "custom") {
          return;
        }
        if (!value || !value.trim()) {
          return "Enter a custom color";
        }
        if (!isValidColor(value)) {
          return "Invalid format (HEX, RGB, or RGBA)";
        }
      },
      backgroundImage: (value) => {
        // Only validate when image background is selected and not using folder icon
        if (values.backgroundType !== "image" || !values.addBackground || values.useFolderIcon) {
          return;
        }
        if (!value || value.length === 0) {
          return "Select a background image";
        }
        if (!isValidImageFile(value[0])) {
          return "Invalid image file type";
        }
      },
    },
    onSubmit: handleFormSubmit,
  });

  // Detect target type from selected path
  const targetType: TargetType = useMemo(() => {
    const targetPath = values.targetApp?.[0];
    return targetPath ? getTargetType(targetPath) : "app";
  }, [values.targetApp]);

  // Whether to show folder-specific options
  const isFolder = targetType === "folder";
  const useFolderIcon = isFolder && values.useFolderIcon;
  const hasEmojiSelected = Boolean(values.selectedEmoji) && values.selectedEmoji !== NO_EMOJI;
  const hasIconFileSelected = values.iconFile && values.iconFile.length > 0;
  const hasTargetSelected = values.targetApp && values.targetApp.length > 0;

  async function handleFormSubmit(formValues: FormValues) {
    const selectedTarget = formValues.targetApp[0];
    const restart = formValues.restartApp;
    const useBackground = formValues.addBackground;
    const currentTargetType = getTargetType(selectedTarget);
    const folderIconEnabled = currentTargetType === "folder" && formValues.useFolderIcon;

    // Determine icon source: emoji or file
    let selectedIcon: string;
    // Check that selectedEmoji exists and is not an empty string
    // When icon file is selected, emoji dropdown is hidden and selectedEmoji becomes undefined
    const usingEmoji = Boolean(formValues.selectedEmoji) && formValues.selectedEmoji !== NO_EMOJI;

    if (usingEmoji) {
      const extractToast = await showToast({
        style: Toast.Style.Animated,
        title: "Extracting emoji...",
      });
      const emojiPath = await extractEmojiImage(emojiSpritesheetPath, formValues.selectedEmoji);
      if (!emojiPath) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Emoji Not Found",
          message: `Could not extract emoji: ${formValues.selectedEmoji}`,
        });
        return;
      }
      selectedIcon = emojiPath;
      // Hide the extraction toast after success
      await extractToast.hide();
    } else {
      if (!formValues.iconFile || formValues.iconFile.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Icon Selected",
          message: "Please select an icon file or emoji",
        });
        return;
      }
      selectedIcon = formValues.iconFile[0];
    }

    // If background is enabled or folder icon is enabled, build config and go to preview
    if (useBackground || folderIconEnabled) {
      const backgroundConfig = await buildBackgroundConfig(formValues, folderIconEnabled);

      if (backgroundConfig) {
        push(
          <IconPreview
            iconPath={selectedIcon}
            appPath={selectedTarget}
            backgroundConfig={backgroundConfig}
            restartApp={restart}
            targetType={currentTargetType}
            useFolderIcon={folderIconEnabled}
            preserveImageDetails={formValues.preserveImageDetails}
            folderIconPath={folderIconPath}
            onApply={handleApplyFromPreview}
            onBack={() => pop()}
          />,
        );
      }
      return;
    }

    // Direct apply without background
    if (restart && currentTargetType === "app") {
      const appRunning = isAppRunning(selectedTarget);

      if (appRunning) {
        const confirmed = await confirmAppRestart(selectedTarget);

        if (!confirmed) {
          return;
        }
      }
    }

    await applyIcon({
      appPath: selectedTarget,
      iconPath: selectedIcon,
      restartApp: restart && currentTargetType === "app",
    });
  }

  const handleApplyFromPreview = async (result: ApplyIconResult) => {
    const { processedIconPath, appPath: targetPath, restartApp } = result;
    const isApp = targetPath.endsWith(".app");

    if (restartApp && isApp) {
      const appRunning = isAppRunning(targetPath);

      if (appRunning) {
        const confirmed = await confirmAppRestart(targetPath);

        if (!confirmed) {
          return;
        }
      }
    }

    await applyIcon({
      appPath: targetPath,
      iconPath: "", // Not used when processedIconPath is provided
      restartApp: restartApp && isApp,
      processedIconPath,
    });
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={values?.addBackground || useFolderIcon ? "Preview" : "Apply Icon"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        title="Target"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={true}
        info="Select an app, file, or folder to customize"
        {...itemProps.targetApp}
      />

      {!hasEmojiSelected && (
        <Form.FilePicker
          title="Icon Image"
          allowMultipleSelection={false}
          canChooseDirectories={false}
          info="Select a .png, .jpg or .icns file to use as the new icon"
          {...itemProps.iconFile}
        />
      )}

      {!hasIconFileSelected && (
        <Form.Dropdown title="Pick Emoji" info="Choose an emoji instead of an image file" {...itemProps.selectedEmoji}>
          <Form.Dropdown.Item key="none" value={NO_EMOJI} title="None (use Icon Image)" icon={Icon.Document} />
          {Array.from(curatedEmojis.entries()).map(([category, emojis]) => (
            <Form.Dropdown.Section key={category} title={category}>
              {emojis.map((emoji) => (
                <Form.Dropdown.Item
                  key={emoji.shortName}
                  value={emoji.shortName}
                  title={`${emoji.emojiChar} ${emoji.displayName}`}
                />
              ))}
            </Form.Dropdown.Section>
          ))}
        </Form.Dropdown>
      )}

      {hasTargetSelected && targetType === "app" && (
        <Form.Checkbox
          title="Restart App"
          label="Restart the app after changing icon (if running)"
          info="Restart the app to refresh the icon"
          {...itemProps.restartApp}
        />
      )}

      {hasTargetSelected && isFolder && (
        <Form.Checkbox
          title="Use Folder Icon"
          label="Overlay on default macOS folder icon"
          info="Adds your image or emoji on top of a folder icon"
          {...itemProps.useFolderIcon}
        />
      )}

      {useFolderIcon && (
        <Form.Checkbox
          title="Preserve Details"
          label="Keep image details (vs flat silhouette)"
          info="Shows a grayscale version of your image using the selected color shades"
          {...itemProps.preserveImageDetails}
        />
      )}

      {!useFolderIcon && (
        <Form.Checkbox
          title="Add Background"
          label="Add background with rounded corners"
          info="Add a background to transparent image"
          {...itemProps.addBackground}
        />
      )}

      {(values.addBackground || useFolderIcon) && (
        <BackgroundOptions
          backgroundTypeProps={itemProps.backgroundType}
          solidColorProps={itemProps.solidColor}
          gradientPresetProps={itemProps.gradientPreset}
          customColorProps={itemProps.customColor}
          backgroundImageProps={itemProps.backgroundImage}
          currentBackgroundType={values.backgroundType as BackgroundType}
          hideImageOption={useFolderIcon}
          hideGradientOption={useFolderIcon}
          showDefaultColor={useFolderIcon}
        />
      )}
    </Form>
  );
}
