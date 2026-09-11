/**
 * Card country permissions form component.
 */

import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { withSessionRefresh, type useBunqSession } from "../../hooks/useBunqSession";
import { updateCard, type Card } from "../../api/endpoints";
import { getCardName, COUNTRY_OPTIONS } from "./card-helpers";
import { formatDateForApi } from "../../lib/formatters";
import { getErrorMessage } from "../../lib/errors";
import { requireUserId } from "../../lib/session-guard";

interface CardCountryFormProps {
  card: Card;
  session: ReturnType<typeof useBunqSession>;
  onUpdate: () => void;
}

export function CardCountryForm({ card, session, onUpdate }: CardCountryFormProps) {
  const { pop } = useNavigation();
  const currentCountries = card.country_permission?.map((c) => c.country).filter((c): c is string => !!c) || [];

  const [selectedCountries, setSelectedCountries] = useState<string[]>(currentCountries);
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (selectedCountries.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Select at least one country" });
      return;
    }

    if (hasExpiry && !expiryDate) {
      await showToast({ style: Toast.Style.Failure, title: "Please select an expiry date" });
      return;
    }

    setIsSubmitting(true);
    try {
      await showToast({ style: Toast.Style.Animated, title: "Updating country permissions..." });

      const countryPermissions = selectedCountries.map((country) => ({
        country,
        ...(hasExpiry && expiryDate ? { expiry_time: formatDateForApi(expiryDate) + " 23:59:59" } : {}),
      }));

      const userId = requireUserId(session);
      await withSessionRefresh(session, () =>
        updateCard(userId, card.id, { country_permission: countryPermissions }, session.getRequestOptions()),
      );

      await showToast({ style: Toast.Style.Success, title: "Country permissions updated" });
      onUpdate();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update countries",
        message: getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnableAll = () => {
    setSelectedCountries(COUNTRY_OPTIONS.map((c) => c.code));
  };

  const handleDisableAll = () => {
    setSelectedCountries([]);
  };

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={`Country Permissions - ${getCardName(card)}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Countries" icon={Icon.Check} onSubmit={handleSubmit} />
          <Action title="Enable All" icon={Icon.CheckCircle} onAction={handleEnableAll} />
          <Action title="Disable All" icon={Icon.XMarkCircle} onAction={handleDisableAll} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Select countries where ${getCardName(card)} can be used`} />
      <Form.TagPicker
        id="countries"
        title="Allowed Countries"
        value={selectedCountries}
        onChange={setSelectedCountries}
      >
        {COUNTRY_OPTIONS.map((country) => (
          <Form.TagPicker.Item key={country.code} value={country.code} title={`${country.name} (${country.code})`} />
        ))}
      </Form.TagPicker>
      <Form.Separator />
      <Form.Checkbox
        id="hasExpiry"
        label="Set temporary permission"
        value={hasExpiry}
        onChange={setHasExpiry}
        info="Permissions will automatically expire on the selected date"
      />
      {hasExpiry && (
        <Form.DatePicker
          id="expiryDate"
          title="Expires On"
          value={expiryDate}
          onChange={setExpiryDate}
          type={Form.DatePicker.Type.Date}
        />
      )}
    </Form>
  );
}
