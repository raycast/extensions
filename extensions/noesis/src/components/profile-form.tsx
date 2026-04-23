import React, { useMemo, useState } from "react";
import { Action, Form, Icon, showToast, Toast } from "@raycast/api";
import { NoesisActionPanel } from "./noesis-actions";
import { updateUserProfile } from "../lib/api";
import { syncDashboardSnapshot } from "../lib/queries";
import {
  DashboardSnapshot,
  UserProfileSnapshot,
  UserProfileUpdate,
} from "../lib/types";
import { getStoredConfig } from "../lib/settings";

interface ProfileFormValues {
  fullName: string;
  email: string;
  birthDate: string;
  birthTime: string;
  locationName: string;
  latitude: string;
  longitude: string;
  timezone: string;
  preferencesJson: string;
}

export function ProfileForm({
  snapshot,
}: {
  snapshot: DashboardSnapshot | null;
}) {
  const initial = useMemo(
    () => buildInitialValues(snapshot?.profile),
    [snapshot],
  );
  const [fullName, setFullName] = useState(initial.fullName);
  const [email, setEmail] = useState(initial.email);
  const [birthDate, setBirthDate] = useState(initial.birthDate);
  const [birthTime, setBirthTime] = useState(initial.birthTime);
  const [locationName, setLocationName] = useState(initial.locationName);
  const [latitude, setLatitude] = useState(initial.latitude);
  const [longitude, setLongitude] = useState(initial.longitude);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [preferencesJson, setPreferencesJson] = useState(
    initial.preferencesJson,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: ProfileFormValues) => {
    const config = await getStoredConfig();
    if (!config) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Selemene Engine API key",
        message: "Run API Key before saving your profile.",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving profile",
    });
    setIsSubmitting(true);
    try {
      const payload = toProfileUpdate(values);
      await updateUserProfile(config, payload);
      await syncDashboardSnapshot({ force: true });
      toast.style = Toast.Style.Success;
      toast.title = "Profile updated";
      toast.message = "Birth data and timezone are ready for new readings.";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Profile update failed";
      toast.message =
        error instanceof Error ? error.message : "Unknown profile update error";
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Tryambakam Profile"
      actions={
        <NoesisActionPanel>
          <Action.SubmitForm
            title="Save Profile"
            icon={Icon.CheckCircle}
            onSubmit={() =>
              handleSubmit({
                fullName,
                email,
                birthDate,
                birthTime,
                locationName,
                latitude,
                longitude,
                timezone,
                preferencesJson,
              })
            }
          />
        </NoesisActionPanel>
      }
    >
      <Form.Description
        title="Profile"
        text="These values get reused as the default birth data context for engine and workflow runs."
      />
      <Form.TextField
        id="fullName"
        title="Full Name"
        value={fullName}
        onChange={setFullName}
      />
      <Form.TextField
        id="email"
        title="Email"
        value={email}
        onChange={setEmail}
      />
      <Form.TextField
        id="birthDate"
        title="Birth Date"
        value={birthDate}
        onChange={setBirthDate}
        placeholder="YYYY-MM-DD"
      />
      <Form.TextField
        id="birthTime"
        title="Birth Time"
        value={birthTime}
        onChange={setBirthTime}
        placeholder="HH:MM"
      />
      <Form.TextField
        id="locationName"
        title="Birth Location"
        value={locationName}
        onChange={setLocationName}
        placeholder="Bengaluru, India"
      />
      <Form.TextField
        id="latitude"
        title="Latitude"
        value={latitude}
        onChange={setLatitude}
        placeholder="12.9716"
      />
      <Form.TextField
        id="longitude"
        title="Longitude"
        value={longitude}
        onChange={setLongitude}
        placeholder="77.5946"
      />
      <Form.TextField
        id="timezone"
        title="Timezone"
        value={timezone}
        onChange={setTimezone}
        placeholder="Asia/Kolkata"
      />
      <Form.TextArea
        id="preferencesJson"
        title="Preferences JSON"
        value={preferencesJson}
        onChange={setPreferencesJson}
      />
    </Form>
  );
}

function buildInitialValues(profile?: UserProfileSnapshot): ProfileFormValues {
  return {
    fullName: profile?.fullName ?? "",
    email: profile?.email ?? "",
    birthDate: profile?.birthDate ?? "",
    birthTime: normalizeBirthTime(profile?.birthTime),
    locationName: profile?.birthLocation?.name ?? "",
    latitude:
      profile?.birthLocation?.latitude !== undefined
        ? String(profile.birthLocation.latitude)
        : "",
    longitude:
      profile?.birthLocation?.longitude !== undefined
        ? String(profile.birthLocation.longitude)
        : "",
    timezone: profile?.timezone ?? "",
    preferencesJson: JSON.stringify(profile?.preferences ?? {}, null, 2),
  };
}

function toProfileUpdate(values: ProfileFormValues): UserProfileUpdate {
  const latitude = parseOptionalNumber(values.latitude, "Latitude", -90, 90);
  const longitude = parseOptionalNumber(
    values.longitude,
    "Longitude",
    -180,
    180,
  );

  if (
    (latitude !== undefined || longitude !== undefined) &&
    (latitude === undefined || longitude === undefined)
  ) {
    throw new Error(
      "Latitude and longitude must both be provided when setting a birth location.",
    );
  }

  if (values.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(values.birthDate)) {
    throw new Error("Birth date must use YYYY-MM-DD.");
  }

  if (values.birthTime && !/^\d{2}:\d{2}(:\d{2})?$/.test(values.birthTime)) {
    throw new Error("Birth time must use HH:MM or HH:MM:SS.");
  }

  return {
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    birthDate: values.birthDate.trim() || undefined,
    birthTime: values.birthTime.trim() || undefined,
    birthLocation:
      latitude !== undefined && longitude !== undefined
        ? {
            latitude,
            longitude,
            name: values.locationName.trim() || undefined,
          }
        : undefined,
    timezone: values.timezone.trim() || undefined,
    preferences: parsePreferences(values.preferencesJson),
  };
}

function parsePreferences(raw: string) {
  const value = raw.trim();
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Expected an object");
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      `Preferences JSON must be a valid object. ${error instanceof Error ? error.message : ""}`.trim(),
    );
  }
}

function parseOptionalNumber(
  raw: string,
  label: string,
  min: number,
  max: number,
): number | undefined {
  const value = raw.trim();
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`);
  }

  return parsed;
}

function normalizeBirthTime(value?: string) {
  if (!value) {
    return "";
  }

  return value.replace(/:00$/, "");
}
