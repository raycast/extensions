import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { fetchProjects } from "./commands/projects/api";
import { Customer } from "./commands/customers/types";
import { CustomerLayout, getCustomerLayouts, storeCustomerLayouts } from "./utils/storage";
import { finishMenuBarForm } from "./utils/refresh";

// Settings for the menu bar: show each customer inline (own section), as a submenu, or hide it.
export default function Command() {
  const { data: projects, isLoading: isLoadingProjects } = useCachedPromise(fetchProjects, [], {
    keepPreviousData: true,
  });
  const { data: layouts, isLoading: isLoadingLayouts } = usePromise(getCustomerLayouts);

  const customers = new Map<number, Customer>();
  (projects ?? []).forEach((project) => {
    if (project.customer && !customers.has(project.customer.id)) {
      customers.set(project.customer.id, project.customer);
    }
  });
  const sortedCustomers = [...customers.values()].sort((a, b) => a.name.localeCompare(b.name));

  const submit = async (values: Record<string, string>) => {
    const updated: Record<number, CustomerLayout> = {};
    sortedCustomers.forEach((customer) => {
      // Only store what differs from the default "inline".
      const layout = values[`customer-${customer.id}`] as CustomerLayout;
      if (layout !== CustomerLayout.inline) {
        updated[customer.id] = layout;
      }
    });
    await storeCustomerLayouts(updated);
    await finishMenuBarForm();
  };

  // Form fields read their default value only once, so render them after the data is known.
  const isReady = projects !== undefined && layouts !== undefined;

  return (
    <Form
      isLoading={isLoadingProjects || isLoadingLayouts}
      navigationTitle="Menu Bar Settings"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Save Settings" onSubmit={submit} />
        </ActionPanel>
      }
    >
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
}
