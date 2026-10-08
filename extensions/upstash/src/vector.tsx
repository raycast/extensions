import { FormValidation, MutatePromise, useFetch, useForm } from "@raycast/utils";
import { API_HEADERS, API_URL, deleteUpstash, OpenInUpstash, postUpstash } from "./upstash";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";

interface VectorIndex {
  id: string;
  name: string;
  endpoint: string;
  pinned?: true;
}

export default function Vector() {
  const {
    isLoading,
    data: indexes,
    error,
    mutate,
  } = useFetch<VectorIndex[], VectorIndex[]>(API_URL + "vector/index", {
    headers: API_HEADERS,
    initialData: [],
  });

  async function confirmAndDelete(index: VectorIndex) {
    await confirmAlert({
      title: `Delete "${index.name}"?`,
      message: "All data will be deleted permanently. This action cannot be undone.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete",
        async onAction() {
          const toast = await showToast(Toast.Style.Animated, "Deleting", index.name);
          try {
            await mutate(deleteUpstash(`vector/index/${index.id}`), {
              optimisticUpdate(data) {
                return data.filter((i) => i.id !== index.id);
              },
              shouldRevalidateAfter: false,
            });
            toast.style = Toast.Style.Success;
            toast.title = "Deleted";
          } catch (error) {
            toast.style = Toast.Style.Failure;
            toast.title = "Failed";
            toast.message = `${error}`;
          }
        },
      },
    });
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && !indexes.length && !error ? (
        <List.EmptyView
          icon="empty-image.svg"
          title="Create Index"
          description="We manage the index for you and you only pay for what you use."
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Create Index" target={<CreateIndex mutate={mutate} />} />
            </ActionPanel>
          }
        />
      ) : (
        indexes.map((index) => (
          <List.Item
            key={index.id}
            icon="vector.svg"
            title={index.name}
            subtitle={index.endpoint}
            accessories={[{ ...(index.pinned && { icon: Icon.Star }) }]}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Plus} title="Create Index" target={<CreateIndex mutate={mutate} />} />
                <Action
                  icon={Icon.Trash}
                  title="Delete Index"
                  onAction={() => confirmAndDelete(index)}
                  style={Action.Style.Destructive}
                />
                <OpenInUpstash route={`vector/${index.id}`} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function CreateIndex({ mutate }: { mutate: MutatePromise<VectorIndex[]> }) {
  const { pop } = useNavigation();

  interface FormValues {
    name: string;
    region: string;
    index_type: string;
    similarity_function?: string;
    dimension_count: string;
  }
  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.name);
      try {
        await mutate(
          postUpstash("vector/index", {
            ...values,
            ...(values.dimension_count && { dimension_count: +values.dimension_count }),
          }),
        );
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      name: FormValidation.Required,
      region: FormValidation.Required,
      index_type: FormValidation.Required,
    },
    initialValues: {
      dimension_count: "1536",
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Name"
        placeholder="chat-memory"
        info="Name can only contain alphanumeric, underscore, hyphen and dot."
        {...itemProps.name}
      />
      <Form.Dropdown
        title="Region"
        info="For best performance, select the region closest to your users."
        {...itemProps.region}
      >
        <Form.Dropdown.Section title="Amazon Web Services">
          <Form.Dropdown.Item title="N. Virginia, USA (us-east-1)" value="us-east-1" />
          <Form.Dropdown.Item title="Ireland (eu-west-1)" value="eu-west-1" />
        </Form.Dropdown.Section>
      </Form.Dropdown>
      <Form.Dropdown
        title="Type"
        info="Choose dense for semantic, sparse for lexical similarity. Hybrid for both."
        {...itemProps.index_type}
      >
        <Form.Dropdown.Item title="Dense" value="DENSE" />
        <Form.Dropdown.Item title="Sparse" value="SPARSE" />
        <Form.Dropdown.Item title="Hybrid" value="HYBRID" />
      </Form.Dropdown>
      {values.index_type !== "SPARSE" && (
        <>
          <Form.TextField
            title="Dimensions"
            placeholder="1024"
            info="You have to use prefined dimensions for specific models."
            {...itemProps.dimension_count}
          />
          <Form.Dropdown title="Metric" {...itemProps.similarity_function}>
            <Form.Dropdown.Item title="COSINE" value="COSINE" />
            <Form.Dropdown.Item title="EUCLIDIAN" value="EUCLIDIAN" />
            <Form.Dropdown.Item title="DOT_PRODUCT" value="DOT_PRODUCT" />
          </Form.Dropdown>
        </>
      )}
    </Form>
  );
}
