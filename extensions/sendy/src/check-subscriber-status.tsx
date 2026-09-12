import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { buildSendyUrl, checkSubscriberStatus, getBrands, getLists } from "./sendy";
import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";

export default function CheckSubscriberStatus() {
  const { isLoading, data: brands } = useCachedPromise(async () => {
    const brands = await getBrands();
    const brandsWithLists = await Promise.all(
      Object.values(brands).map(async (brand) => {
        const lists = await getLists(brand.id);
        return {
          ...brand,
          lists: Object.values(lists ?? {}),
        };
      }),
    );
    return brandsWithLists;
  });

  const { handleSubmit, itemProps } = useForm<{ listId: string; email: string }>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Checking", values.email);
      try {
        const message = await checkSubscriberStatus(values.listId, values.email);
        toast.style = Toast.Style.Success;
        toast.title = "Checked";
        toast.message = message;
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      listId: FormValidation.Required,
      email: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.QuestionMark} title="Check Subscriber Status" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="List" {...itemProps.listId}>
        {brands?.map((brand) => (
          <Form.Dropdown.Section key={brand.id} title={brand.name}>
            {brand.lists.map((list) => (
              <Form.Dropdown.Item
                key={list.id}
                icon={buildSendyUrl(`uploads/logos/${brand.id}.png`).toString()}
                title={list.name}
                value={list.id}
              />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>
      <Form.TextField title="Email" placeholder="raycast@example.com" {...itemProps.email} />
    </Form>
  );
}
