import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { fetchProjects } from "../projects/api";
import { Customer } from "../customers/types";
import {
  CustomerLayout,
  getCustomerLayouts,
  getShowTotalTime,
  storeCustomerLayouts,
  storeShowTotalTime,
} from "../../utils/storage";
import { finishMenuBarForm } from "../../utils/refresh";

// Settings for the menu bar: total time next to the icon, and per customer inline, submenu or hidden.
export const MenuBarSettings = () => {
  const { data: projects, isLoading: isLoadingProjects } = useCachedPromise(fetchProjects, [], {
    keepPreviousData: true,
  });
  const { data: layouts, isLoading: isLoadingLayouts } = usePromise(getCustomerLayouts);
  const { data: showTotalTime, isLoading: isLoadingShowTotalTime } = usePromise(getShowTotalTime);

  const customers = new Map<number, Customer>();
  (projects ?? []).forEach((project) => {
    if (project.customer && !customers.has(project.customer.id)) {
      customers.set(project.customer.id, project.customer);
    }
  });
  const sortedCustomers = [...customers.values()].sort((a, b) => a.name.localeCompare(b.name));

  const submit = async (values: Form.Values) => {
    // Start from the stored layouts: customers not shown right now (no assigned project) keep theirs.
    const updated: Record<number, CustomerLayout> = { ...layouts };
    sortedCustomers.forEach((customer) => {
      // Only store what differs from the default "inline".
      const layout = values[`customer-${customer.id}`] as CustomerLayout;
      if (layout === CustomerLayout.inline) {
        delete updated[customer.id];
      } else {
        updated[customer.id] = layout;
      }
    });
    await Promise.all([storeCustomerLayouts(updated), storeShowTotalTime(values.showTotalTime === true)]);
    await finishMenuBarForm();
  };

  // Form fields read their default value only once, so render them after the data is known.
  const isReady = projects !== undefined && layouts !== undefined && showTotalTime !== undefined;

  return (
    <Form
      isLoading={isLoadingProjects || isLoadingLayouts || isLoadingShowTotalTime}
      navigationTitle="Menu Bar Settings"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Save Settings" onSubmit={submit} />
        </ActionPanel>
      }
    >
      {isReady ? (
        <Form.Checkbox
          id="showTotalTime"
          title="Menu Bar"
          label="Show today's total time next to the icon"
          defaultValue={showTotalTime}
        />
      ) : null}
      <Form.Separator />
      <Form.Description
        title="Customers"
        text="Inline: own section in the menu. Submenu: one row per customer, projects inside. Hidden: not in the menu. Favorite tasks still show."
      />
      {isReady
        ? sortedCustomers.map((customer) => (
            <Form.Dropdown
              key={customer.id}
              id={`customer-${customer.id}`}
              title={customer.name}
              defaultValue={layouts[customer.id] ?? CustomerLayout.inline}
            >
              <Form.Dropdown.Item value={CustomerLayout.inline} title="Inline" />
              <Form.Dropdown.Item value={CustomerLayout.submenu} title="Submenu" />
              <Form.Dropdown.Item value={CustomerLayout.hidden} title="Hidden" />
            </Form.Dropdown>
          ))
        : null}
    </Form>
  );
};
