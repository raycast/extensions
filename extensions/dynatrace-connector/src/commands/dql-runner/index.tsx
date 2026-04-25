// P2-S1: DQL Runner — execute arbitrary DQL queries
import { Form, Action, ActionPanel, showToast, Toast, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { getActiveTenant, setActiveTenant, listTenants } from "../../lib/tenants";
import type { TenantConfig } from "../../lib/auth";
import QueryResultsView from "./query-results";

interface FormValues {
  tenantId: string;
  dql: string;
  timeframePreset: string;
  timeframeCustomFrom?: string;
  timeframeCustomTo?: string;
  saveAsTemplate: boolean;
  templateName?: string;
}

interface FormState {
  timeframePreset: string;
  customFrom?: Date;
  customTo?: Date;
}

export default function DqlRunnerCommand() {
  const [allTenants, setAllTenants] = useState<TenantConfig[]>([]);
  const [activeTenant, setActiveTenantState] = useState<string>("");
  const [presetDql, setPresetDql] = useState<string>("");
  const [formState, setFormState] = useState<FormState>({ timeframePreset: "1h" });

  useEffect(() => {
    Promise.all([getActiveTenant(), listTenants(), LocalStorage.getItem("dql-runner-preset")]).then(
      async ([active, tenants, preset]) => {
        setAllTenants(tenants);
        if (active) setActiveTenantState(active.id);

        // Load preset if available
        if (preset) {
          try {
            const parsed = JSON.parse(String(preset));

            setPresetDql(parsed.dql || "");
            const timeframe = parsed.timeframePreset || "1h";
            setFormState({ timeframePreset: timeframe }); // ← Update formState too!

            // Handle custom timeframe dates - set in state for DatePicker
            const customDates: Partial<FormState> = {};
            if (parsed.timeframeCustomFrom) {
              const fromDate = new Date(parsed.timeframeCustomFrom);
              customDates.customFrom = fromDate;
            }

            if (parsed.timeframeCustomTo) {
              const toDate = new Date(parsed.timeframeCustomTo);
              customDates.customTo = toDate;
            }

            // Update formState with dates
            if (customDates.customFrom || customDates.customTo) {
              setFormState((prev) => ({
                ...prev,
                customFrom: customDates.customFrom,
                customTo: customDates.customTo,
              }));
            }

            // Clear the temporary preset after loading
            await LocalStorage.removeItem("dql-runner-preset");

            // Also clear storeValue cache so defaultValue takes effect
            await LocalStorage.removeItem("timeframePreset");
          } catch {
            // Silent fail: preset loading is non-critical
          }
        }
      },
    );
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    dql: string;
    timeframe?: { start: string; end: string };
  } | null>(null);

  const handleSubmit = async (values: FormValues) => {
    setIsLoading(true);

    try {
      // Set the selected tenant as active
      if (values.tenantId) {
        await setActiveTenant(values.tenantId);
      }

      const tenant = allTenants.find((t) => t.id === values.tenantId);
      if (!tenant) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Tenant Selected",
          message: "Please select a tenant",
        });
        setIsLoading(false);
        return;
      }

      // Build timeframe from preset or custom
      let timeframe: { start: string; end: string } | undefined;
      if (values.timeframePreset !== "custom") {
        const now = new Date();
        const start = new Date();

        switch (values.timeframePreset) {
          case "15m":
            start.setMinutes(start.getMinutes() - 15);
            break;
          case "1h":
            start.setHours(start.getHours() - 1);
            break;
          case "4h":
            start.setHours(start.getHours() - 4);
            break;
          case "24h":
            start.setHours(start.getHours() - 24);
            break;
          case "7d":
            start.setDate(start.getDate() - 7);
            break;
        }

        timeframe = {
          start: start.toISOString(),
          end: now.toISOString(),
        };
      } else if (formState.customFrom && formState.customTo) {
        timeframe = {
          start: formState.customFrom.toISOString(),
          end: formState.customTo.toISOString(),
        };
      }

      // Set results to trigger view transition
      setResults({
        dql: values.dql,
        timeframe,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If we have results, show the results view
  if (results) {
    return <QueryResultsView dql={results.dql} timeframe={results.timeframe} onClose={() => setResults(null)} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Query" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {/* ─── TENANT SELECTION ─── */}
      {allTenants.length > 0 && (
        <Form.Dropdown id="tenantId" title="Tenant" value={activeTenant} onChange={setActiveTenantState} storeValue>
          {allTenants.map((t) => (
            <Form.Dropdown.Item key={t.id} value={t.id} title={t.name} />
          ))}
        </Form.Dropdown>
      )}

      {allTenants.length > 0 && <Form.Separator />}

      {/* ─── DQL QUERY (MAIN) ─── */}
      <Form.Description text="Write your DQL query" />
      <Form.TextArea
        id="dql"
        title="Query"
        placeholder="fetch logs | filter dt.process.name == 'Service' | limit 100"
        defaultValue={presetDql}
        storeValue
      />

      <Form.Separator />

      {/* ─── TIMEFRAME SELECTION ─── */}
      <Form.Description text="Select timeframe for the query" />
      <Form.Dropdown
        id="timeframePreset"
        title="Timeframe"
        value={formState.timeframePreset}
        onChange={(value) => {
          setFormState({ timeframePreset: value });
        }}
        storeValue
      >
        <Form.Dropdown.Item value="15m" title="Last 15 minutes" />
        <Form.Dropdown.Item value="1h" title="Last hour" />
        <Form.Dropdown.Item value="4h" title="Last 4 hours" />
        <Form.Dropdown.Item value="24h" title="Last 24 hours" />
        <Form.Dropdown.Item value="7d" title="Last 7 days" />
        <Form.Dropdown.Item value="custom" title="Custom range" />
      </Form.Dropdown>

      {/* ─── CUSTOM DATE PICKERS (only when selected) ─── */}
      {formState.timeframePreset === "custom" && (
        <>
          <Form.DatePicker
            id="timeframeCustomFrom"
            title="From"
            value={formState.customFrom}
            onChange={(date) => setFormState((prev) => ({ ...prev, customFrom: date ?? undefined }))}
            storeValue
          />
          <Form.DatePicker
            id="timeframeCustomTo"
            title="To"
            value={formState.customTo}
            onChange={(date) => setFormState((prev) => ({ ...prev, customTo: date ?? undefined }))}
            storeValue
          />
        </>
      )}

      <Form.Separator />

      {/* ─── SAVE AS TEMPLATE (OPTIONAL) ─── */}
      <Form.Description text="Optionally save this query as a template" />
      <Form.Checkbox id="saveAsTemplate" title="Save as Template" label="Reuse this query later" storeValue />
      <Form.TextField id="templateName" title="Template Name" placeholder="e.g. 'Auth Service Errors'" storeValue />
    </Form>
  );
}
