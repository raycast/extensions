import { Action, ActionPanel, Icon, List, showToast, useNavigation } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";

import { DefaultAppByUniformTypeForm } from "./components/default-app-by-uniform-type-form/default-app-by-uniform-type-form";
import { UniformTypeDetail } from "./components/uniform-type-detail/uniform-type-detail";
import { useKnownUniformTypes } from "./hooks/use-known-utis";
import { getAccessories } from "./utitlities/get-accessories";
import { getKeywords } from "./utitlities/get-keywords";
import { toTitleCase } from "./utitlities/to-title-case";

export default function SetForKnownFileTypes() {
  const { data: data, isLoading: isLoading, setHandler: setHandler } = useKnownUniformTypes();
  const [isShowingDetail, setIsShowingDetail] = useCachedState("is-showing-detail", false);
  const [showSectionTitles, setShowSectionTitles] = useState(true);
  const { pop } = useNavigation();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for applications, extensions or file types"
      isShowingDetail={isShowingDetail}
      filtering={true}
      onSearchTextChange={(searchText) =>
        searchText.length > 0 ? setShowSectionTitles(false) : setShowSectionTitles(true)
      }
    >
      <List.Section
        title={showSectionTitles ? "Known File Types" : "Search Results"}
        subtitle={showSectionTitles ? data?.length.toString() : undefined}
      >
        {data?.map((uniformType) => (
          <List.Item
            key={uniformType.id}
            keywords={getKeywords(uniformType)}
            subtitle={uniformType.description && !isShowingDetail ? uniformType.id : undefined}
            title={uniformType.description ? toTitleCase(uniformType.description) : uniformType.id}
            accessories={isShowingDetail ? undefined : getAccessories(uniformType)}
            detail={<UniformTypeDetail uniformType={uniformType} />}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    icon={Icon.AppWindowList}
                    title="Change Default App"
                    target={
                      <DefaultAppByUniformTypeForm
                        uniformType={uniformType}
                        navigationTitle={
                          uniformType.description
                            ? `Set Default App For ${toTitleCase(uniformType.description)}`
                            : undefined
                        }
                        onSubmit={async ({ applicationPath }) => {
                          await setHandler({ applicationPath, uniformTypeId: uniformType.id });
                          showToast({ title: "Default Application Changed" });
                          pop();
                        }}
                      />
                    }
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    icon={isShowingDetail ? Icon.EyeDisabled : Icon.Eye}
                    title={isShowingDetail ? "Hide Detail" : "Show Detail"}
                    shortcut={{ key: "d", modifiers: ["cmd", "shift"] }}
                    onAction={() => setIsShowingDetail((prev) => !prev)}
                  />
                  <Action.ShowInFinder
                    title={`Show ${uniformType.application.name} in Finder`}
                    path={uniformType.application.path}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard title="Copy Uniform Type Identifier" content={uniformType.id} />
                  <ActionPanel.Submenu icon={Icon.Clipboard} title="Copy App">
                    <Action.CopyToClipboard title="Name" content={uniformType.application.name} />
                    <Action.CopyToClipboard title="Path" content={uniformType.application.path} />
                    {uniformType.application.bundleId && (
                      <Action.CopyToClipboard title="Bundle Id" content={uniformType.application.bundleId} />
                    )}
                  </ActionPanel.Submenu>
                  {uniformType.preferredFilenameExtension && (
                    <Action.CopyToClipboard title="Copy Extension" content={uniformType.preferredFilenameExtension} />
                  )}
                  {uniformType.preferredMimeType && (
                    <Action.CopyToClipboard title="Copy MIME Type" content={uniformType.preferredMimeType} />
                  )}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
