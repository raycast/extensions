import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useState } from "react";
import axios from "axios";

/** Must match package.json "preferences" values. */
interface RaycastExtPreferences {
  twosUserId: string;
  twosToken: string;
}

type TwosThingType = "bullet" | "dash" | "checkbox" | "number" | "none" | "divider";

type FormPayload = {
  text: string;
  type: (typeof THING_TYPES)[number];
  datepicker: Date | null;
};

const TWOS_API_URL = "https://www.twosapp.com/apiV2/user/addToToday";

const THING_TYPES = [
  { value: "bullet" as TwosThingType, label: "• bullet" },
  { value: "dash" as TwosThingType, label: "– dash" },
  { value: "checkbox" as TwosThingType, label: "□ checkbox" },
  { value: "number" as TwosThingType, label: "1. number" },
  { value: "none" as TwosThingType, label: "paragraph text" },
  { value: "divider" as TwosThingType, label: "--- divider" },
];

const COPY_TEXTS = {
  CTA_OPEN_PREF: "Open Extension Preferences",
  ERROR_NON_RESPONSE: "Error making request or receiving response. Check your internet connection.",
  ERROR_HINT_CREDENTIALS: "Make sure you filled your credentials correctly in Raycast Extension Preferences (Cmd + K).",
  SUCCESS_MD_STR: "# Sent ✌️",
};

const FORM_TEXTS = {
  TEXT: {
    LABEL: "Content",
    PLACEHOLDER: "Write thing",
    ERROR_REQ: "Required field",
  },
  DATE: {
    LABEL: "Date",
    HINT: "Custom date supported (type '3 Aug'). Posted in Today if empty.",
  },
  TYPE: {
    LABEL: "Type",
    DEFAULT_OPTION: "Default (from your settings)",
  },
};

export default function Command() {
  const { twosUserId, twosToken } = getPreferenceValues<RaycastExtPreferences>();
  if (!twosToken?.trim() || !twosUserId?.trim()) {
    return <MissingCredsScreen />;
  }

  const [formState, setFormState] = useState<"AVAILABLE" | "SENDING" | "SENT_ERROR" | "SENT_OK">("AVAILABLE");
  const [textError, setTextError] = useState<string | undefined>();

  const checkRemoveTextError = () => {
    if (textError && textError.length > 0) {
      setTextError(undefined);
    }
  };

  const validateText = (value = "") => {
    if (value?.trim().length == 0) {
      setTextError(FORM_TEXTS.TEXT.ERROR_REQ);
      return false;
    } else {
      checkRemoveTextError();
      return true;
    }
  };

  const handleSubmit = async (values: FormPayload) => {
    if (formState === "SENDING") return; // Prevent multiple submit while sending

    const { type, text, datepicker } = values;
    const validText = validateText(text);
    if (!validText) return;

    const payload = {
      text,
      type,
      date: datepicker ? convertDate(datepicker) : "",
      token: twosToken,
      user_id: twosUserId,
    };

    setFormState("SENDING");

    try {
      await axios.post(TWOS_API_URL, payload, { headers: { "Content-Type": "application/json" } });
      showToast({ title: "Success" });
      setFormState("SENT_OK");
    } catch (error) {
      let message = COPY_TEXTS.ERROR_NON_RESPONSE;
      if (axios.isAxiosError(error)) {
        message = error.message;
      } else {
        console.error(error);
      }
      showToast({ style: Toast.Style.Failure, title: "Failed", message });
      setFormState("SENT_ERROR");
    }
  };

  return formState === "SENT_OK" ? (
    <Detail markdown={COPY_TEXTS.SUCCESS_MD_STR} />
  ) : (
    <Form
      isLoading={formState === "SENDING"}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
          <Action title={COPY_TEXTS.CTA_OPEN_PREF} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title={FORM_TEXTS.TEXT.LABEL}
        placeholder={FORM_TEXTS.TEXT.PLACEHOLDER}
        error={textError}
        onBlur={(e) => {
          validateText(e.target.value);
        }}
        onChange={checkRemoveTextError}
      />

      <Form.DatePicker
        id="datepicker"
        title={FORM_TEXTS.DATE.LABEL}
        type={"date" as Form.DatePicker.Type}
        defaultValue={new Date()}
        max={new Date(new Date().setDate(new Date().getDate() + 1))}
        info={FORM_TEXTS.DATE.HINT}
      />

      <Form.Dropdown id="type" title={FORM_TEXTS.TYPE.LABEL}>
        <Form.Dropdown.Item value="" title={FORM_TEXTS.TYPE.DEFAULT_OPTION} />
        {THING_TYPES.map((thingType) => (
          <Form.Dropdown.Item key={thingType.value} value={thingType.value} title={thingType.label} />
        ))}
      </Form.Dropdown>

      {formState === "SENT_ERROR" && <Form.Description title="⚠️" text={COPY_TEXTS.ERROR_HINT_CREDENTIALS} />}
    </Form>
  );
}

/** Fallback if user bypasses Raycast default credentials screen */
const MissingCredsScreen = () => {
  const markdown = `# 🔴 Missing credentials\nPlease update your extension preferences and try again.`;
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title={COPY_TEXTS.CTA_OPEN_PREF} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
};

/**
 * Convert date to twos API format.
 *
 * @param {string} dateStr example: "2023-10-27T05:00:00.001Z"
 * @returns {string} "Oct 27, 2023" | "Oct 9, 2023"
 * (single-digit date without leading zero)
 *
 * App constraints:
 * - Cannot post in future date
 * - (❓) Not sure how far back in the past is supported
 * - If unsupported, "thing" is posted in Today
 */
const convertDate = (dateObj: Date) => {
  return dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
