import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  getPreferenceValues,
  popToRoot,
  open,
  LocalStorage,
} from "@raycast/api";
import React, { useState } from "react";
import { getTodayDate, getDailyStats, addWaterLog } from "./utils/storage";
import { sendToWebhook } from "./utils/webhook";
import { addHabitifyLog } from "./utils/habitify";
import { addNocoDBLog } from "./utils/nocodb";

const CONFETTI_SHOWN_KEY = "confettiShownDate";

interface FormValues {
  amount: string;
  note: string;
}

export default function LogWater() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);

  const defaultAmount = preferences.defaultAmount || "250";
  const dailyGoal = parseInt(preferences.dailyGoal || "2000", 10);

  async function handleSubmit(values: FormValues) {
    setIsLoading(true);

    try {
      const amount = parseInt(values.amount, 10);

      if (isNaN(amount) || amount <= 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Amount",
          message: "Please enter a valid amount in ml.",
        });
        setIsLoading(false);
        return;
      }

      // Add log to storage
      const log = await addWaterLog(amount, values.note || undefined);

      // Get updated stats
      const stats = await getDailyStats(getTodayDate(), dailyGoal);

      // 📤 Send to webhook if configured
      if (preferences.webhookUrl) {
        await sendToWebhook(preferences.webhookUrl, {
          timestamp: log.timestamp,
          amount: log.amount,
          note: log.note || "",
          totalToday: stats.totalAmount,
          goal: dailyGoal,
          percentage: stats.percentage,
        });
      }

      // 📊 Sync to NocoDB if configured
      if (
        preferences.nocodbApiToken &&
        preferences.nocodbBaseUrl &&
        preferences.nocodbTableId
      ) {
        await addNocoDBLog(amount);
      }

      // 🔄 Sync to Habitify if configured
      if (preferences.habitifyApiKey && preferences.habitifyHabitId) {
        const habitifySuccess = await addHabitifyLog(
          preferences.habitifyApiKey,
          preferences.habitifyHabitId,
          amount,
        );
        if (habitifySuccess) {
          console.log("Habitify sync successful");
        }
      }

      // 🎉 Trigger confetti when first reaching goal today
      if (preferences.enableConfetti !== false && stats.percentage >= 100) {
        const confettiShownDate =
          await LocalStorage.getItem<string>(CONFETTI_SHOWN_KEY);
        const today = getTodayDate();
        if (confettiShownDate !== today) {
          await open("raycast://confetti");
          await LocalStorage.setItem(CONFETTI_SHOWN_KEY, today);
        }
      }

      // Show success toast
      await showToast({
        style: Toast.Style.Success,
        title: `Logged ${amount} ml 💧`,
        message: `Total today: ${stats.totalAmount}ml / ${dailyGoal}ml (${stats.percentage}%)`,
      });

      // Close the form
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Log Water",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Log Water" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="amount"
        title="Amount (ml)"
        placeholder="250"
        defaultValue={defaultAmount}
        info="Enter the amount of water in milliliters"
      />
      <Form.TextArea
        id="note"
        title="Note (Optional)"
        placeholder="Glass of water after workout..."
      />
      <Form.Description text={`Daily Goal: ${dailyGoal}ml`} />
    </Form>
  );
}
