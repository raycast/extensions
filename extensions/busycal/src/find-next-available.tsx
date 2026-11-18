import {
  Action,
  ActionPanel,
  Detail,
  Form,
  getPreferenceValues,
  Icon,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useMemo } from "react";
import { findNextBusyCalAvailable } from "./busycal-automation";
import {
  busyCalDateURLForDateString,
  formatAvailabilityDateTime,
} from "./busycal-date";
import { resolveBusyCalInstallation } from "./busycal-installation";
import { useBusyCalCalendars, useBusyCalInstallation } from "./busycal-hooks";
import { CreateEventForm } from "./create-event";
import { openBusyCalURL } from "./busycal-url";
import { BusyCalInstallation, BusyCalNextAvailableResult } from "./types";

/**
 * Form state for BusyCal availability lookups.
 */
interface AvailabilityFormValues {
  minimumDurationMinutes: string;
  calendarID?: string;
  respectWorkingHours: boolean;
}

/**
 * Result screen shown after BusyCal returns the next available slot.
 *
 * - Parameter props: The resolved BusyCal installation plus the returned slot.
 */
function AvailabilityResultDetail(props: {
  installation: BusyCalInstallation;
  result: BusyCalNextAvailableResult | null;
}) {
  if (!props.result) {
    return (
      <Detail
        markdown={
          "# No Matching Slot\n\nBusyCal did not return a free slot for the selected criteria."
        }
      />
    );
  }

  const formattedStart =
    formatAvailabilityDateTime(props.result.startDate) ??
    props.result.startDate;
  const formattedEnd =
    formatAvailabilityDateTime(props.result.endDate) ?? props.result.endDate;
  // The automation layer returns ISO timestamps. The detail view intentionally
  // converts them to local user-facing strings so the result reads like BusyCal,
  // not like a transport payload.
  const slotSummary = [`Start: ${formattedStart}`, `End: ${formattedEnd}`].join(
    "\n",
  );
  const dateURL = busyCalDateURLForDateString(props.result.startDate);
  const detailLines = [
    "# Next Available Slot",
    "",
    `- Start: ${formattedStart}`,
    `- End: ${formattedEnd}`,
  ];
  return (
    <Detail
      markdown={detailLines.join("\n")}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Slot Details"
            content={slotSummary}
            icon={Icon.Clipboard}
          />
          {dateURL ? (
            <Action
              title="Open BusyCal on Date"
              icon={Icon.Calendar}
              onAction={() => openBusyCalURL(props.installation, dateURL)}
            />
          ) : null}
          <Action.Push
            title="Create Event in This Slot"
            icon={Icon.Plus}
            target={
              <CreateEventForm
                submitTitle="Create Event in Slot"
                popOnSuccess
                initialValues={{
                  startDate: new Date(props.result.startDate),
                  endDate: new Date(props.result.endDate),
                }}
              />
            }
          />
        </ActionPanel>
      }
    />
  );
}

/**
 * Raycast command entry point for BusyCal availability lookup.
 */
export default function FindNextAvailableCommand() {
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences.FindNextAvailable>();
  const {
    data: installation,
    error: installationError,
    isLoading: isLoadingInstallation,
  } = useBusyCalInstallation();
  const {
    data: calendars,
    error: calendarsError,
    isLoading: isLoadingCalendars,
  } = useBusyCalCalendars(installation, "event");
  const isLoading = isLoadingInstallation || isLoadingCalendars;
  const errorMessage = calendarsError?.message ?? installationError?.message;

  const calendarItems = useMemo(
    () =>
      (calendars ?? []).map((calendar) => (
        <Form.Dropdown.Item
          key={calendar.calendarID}
          value={calendar.calendarID}
          title={calendar.title}
        />
      )),
    [calendars],
  );

  async function handleSubmit(values: AvailabilityFormValues) {
    try {
      const activeInstallation =
        installation ?? (await resolveBusyCalInstallation());

      const result = await findNextBusyCalAvailable(activeInstallation, {
        minimumDurationMinutes: Number(values.minimumDurationMinutes),
        calendarIDs: values.calendarID ? [values.calendarID] : undefined,
        respectWorkingHours: values.respectWorkingHours,
      });

      await push(
        <AvailabilityResultDetail
          installation={activeInstallation}
          result={result}
        />,
      );
    } catch (error) {
      await showFailureToast(error, {
        title: "Could Not Find Availability",
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Find Next Slot"
            icon={Icon.Clock}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      {errorMessage ? <Form.Description text={errorMessage} /> : null}
      <Form.Dropdown
        id="minimumDurationMinutes"
        title="Minimum Duration"
        defaultValue={preferences.defaultMinimumAvailabilityMinutes || "30"}
      >
        <Form.Dropdown.Item value="15" title="15 minutes" />
        <Form.Dropdown.Item value="30" title="30 minutes" />
        <Form.Dropdown.Item value="45" title="45 minutes" />
        <Form.Dropdown.Item value="60" title="60 minutes" />
        <Form.Dropdown.Item value="90" title="90 minutes" />
      </Form.Dropdown>
      <Form.Dropdown id="calendarID" title="Calendar" defaultValue="">
        <Form.Dropdown.Item
          value=""
          title="BusyCal Default Availability Scope"
        />
        {calendarItems}
      </Form.Dropdown>
      <Form.Checkbox
        id="respectWorkingHours"
        label="Respect working hours"
        defaultValue={preferences.defaultRespectWorkingHours}
      />
    </Form>
  );
}
