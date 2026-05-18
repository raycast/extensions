import { Action, ActionPanel, Form, Icon, Toast, popToRoot, showToast, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";
import { createFriend, Friend, updateFriend } from "./lib/storage";
import { decodeSuggestionValue, encodeSuggestionValue, isValidTimezone, searchTimezones } from "./lib/timezones";
import { t } from "./lib/i18n";

type Props = {
  friend?: Friend;
  onSaved?: (friend: Friend) => void;
};

type FormValues = {
  name: string;
  timezone: string;
  avatar: string[];
  clearAvatar: boolean;
};

export default function FriendForm({ friend, onSaved }: Props) {
  const isEdit = Boolean(friend);
  const { pop } = useNavigation();

  const initialEncoded = friend ? encodeSuggestionValue(friend.timezone, friend.cityLabel) : "";

  const [name, setName] = useState(friend?.name ?? "");
  const [timezone, setTimezone] = useState(initialEncoded);
  const [search, setSearch] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [tzError, setTzError] = useState<string | undefined>();

  const suggestions = useMemo(() => searchTimezones(search), [search]);

  async function handleSubmit(values: FormValues) {
    const decoded = decodeSuggestionValue(values.timezone || "");

    let hasError = false;
    if (!values.name.trim()) {
      setNameError(t("nameRequired"));
      hasError = true;
    }
    if (!values.timezone || !isValidTimezone(decoded.timezone)) {
      setTzError(t("timezoneRequired"));
      hasError = true;
    }
    if (hasError) return;

    try {
      const avatarSourcePath = values.avatar && values.avatar.length > 0 ? values.avatar[0] : undefined;
      const input = {
        name: values.name,
        timezone: decoded.timezone,
        cityLabel: decoded.cityLabel,
        avatarSourcePath,
        clearAvatar: isEdit && !avatarSourcePath && values.clearAvatar,
      };
      const saved = isEdit && friend ? await updateFriend(friend.id, input) : await createFriend(input);
      await showToast({ style: Toast.Style.Success, title: t("friendSaved") });
      if (onSaved) {
        onSaved(saved);
        pop();
      } else {
        await popToRoot();
      }
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("saveFailed"),
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const currentLabel = (() => {
    if (!timezone) return "";
    const { cityLabel } = decodeSuggestionValue(timezone);
    return cityLabel;
  })();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title={t("saveFriend")} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title={t("nameLabel")}
        placeholder={t("namePlaceholder")}
        value={name}
        error={nameError}
        onChange={(v) => {
          setName(v);
          if (nameError) setNameError(undefined);
        }}
      />
      <Form.Dropdown
        id="timezone"
        title={t("timezoneLabel")}
        placeholder={t("timezonePlaceholder")}
        value={timezone}
        error={tzError}
        onChange={(v) => {
          setTimezone(v);
          if (tzError) setTzError(undefined);
        }}
        onSearchTextChange={setSearch}
        throttle
      >
        {timezone && !suggestions.some((s) => s.value === timezone) ? (
          <Form.Dropdown.Item value={timezone} title={currentLabel} />
        ) : null}
        {suggestions.map((s) => (
          <Form.Dropdown.Item key={s.value} value={s.value} title={s.label} />
        ))}
      </Form.Dropdown>
      <Form.Description title={t("tzSearchHintTitle")} text={t("tzSearchHint")} />
      <Form.FilePicker
        id="avatar"
        title={t("avatarLabel")}
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
      />
      {isEdit && friend?.avatarPath ? (
        <Form.Checkbox id="clearAvatar" label="Remove current photo" defaultValue={false} />
      ) : null}
    </Form>
  );
}
