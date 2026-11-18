/**
 * Card limits form component for editing daily spending limits.
 */

import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { withSessionRefresh, type useBunqSession } from "../../hooks/useBunqSession";
import { updateCard, type Card } from "../../api/endpoints";
import { getCardName } from "./card-helpers";
import { getErrorMessage } from "../../lib/errors";
import { CARD_LIMIT_TYPE } from "../../lib/constants";
import { requireUserId } from "../../lib/session-guard";

interface CardLimitsFormProps {
  card: Card;
  session: ReturnType<typeof useBunqSession>;
  onUpdate: () => void;
}

export function CardLimitsForm({ card, session, onUpdate }: CardLimitsFormProps) {
  const { pop } = useNavigation();
  const currentLimits = card.limit || [];
  const currency = currentLimits[0]?.currency || "EUR";

  const getLimitValue = (type: string): string => {
    const limit = currentLimits.find((l) => l.type === type);
    return limit?.daily_limit || "0";
  };

  const [atmLimit, setAtmLimit] = useState(getLimitValue(CARD_LIMIT_TYPE.CARD_LIMIT_ATM));
  const [contactlessLimit, setContactlessLimit] = useState(getLimitValue(CARD_LIMIT_TYPE.CARD_LIMIT_CONTACTLESS));
  const [posLimit, setPosLimit] = useState(getLimitValue(CARD_LIMIT_TYPE.CARD_LIMIT_POS_ICC));
  const [ecommerceLimit, setEcommerceLimit] = useState(getLimitValue(CARD_LIMIT_TYPE.CARD_LIMIT_E_COMMERCE));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await showToast({ style: Toast.Style.Animated, title: "Updating limits..." });

      const newLimits = [
        { daily_limit: atmLimit, currency, type: CARD_LIMIT_TYPE.CARD_LIMIT_ATM },
        { daily_limit: contactlessLimit, currency, type: CARD_LIMIT_TYPE.CARD_LIMIT_CONTACTLESS },
        { daily_limit: posLimit, currency, type: CARD_LIMIT_TYPE.CARD_LIMIT_POS_ICC },
        { daily_limit: ecommerceLimit, currency, type: CARD_LIMIT_TYPE.CARD_LIMIT_E_COMMERCE },
      ].filter((l) => parseFloat(l.daily_limit) > 0);

      const userId = requireUserId(session);
      await withSessionRefresh(session, () =>
        updateCard(
          userId,
          card.id,
          { card_limit: newLimits.map((l) => ({ daily_limit: l.daily_limit, currency: l.currency, type: l.type })) },
          session.getRequestOptions(),
        ),
      );

      await showToast({ style: Toast.Style.Success, title: "Limits updated" });
      onUpdate();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update limits",
        message: getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={`Edit Limits - ${getCardName(card)}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Limits" icon="checkmark" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Set daily spending limits for ${getCardName(card)}`} />
      <Form.TextField
        id="atmLimit"
        title={`ATM Limit (${currency})`}
        placeholder="500"
        value={atmLimit}
        onChange={setAtmLimit}
        info="Daily cash withdrawal limit"
      />
      <Form.TextField
        id="contactlessLimit"
        title={`Contactless Limit (${currency})`}
        placeholder="1000"
        value={contactlessLimit}
        onChange={setContactlessLimit}
        info="Daily contactless payment limit"
      />
      <Form.TextField
        id="posLimit"
        title={`POS/Chip Limit (${currency})`}
        placeholder="2500"
        value={posLimit}
        onChange={setPosLimit}
        info="Daily chip/PIN payment limit"
      />
      <Form.TextField
        id="ecommerceLimit"
        title={`Online Limit (${currency})`}
        placeholder="1500"
        value={ecommerceLimit}
        onChange={setEcommerceLimit}
        info="Daily online payment limit"
      />
    </Form>
  );
}
