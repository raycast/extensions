import { FormValidation, getAvatarIcon, showFailureToast, useCachedPromise, useForm, usePromise } from "@raycast/utils";
import memberstackAdmin from "@memberstack/admin";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { PaginatedPayload, Payload } from "@memberstack/admin/lib/types/payload";
import { Params } from "@memberstack/admin/lib/types/params";
import { useState } from "react";

const { secret_key } = getPreferenceValues<Preferences>();
const memberstack = memberstackAdmin.init(secret_key);
type Member = Payload.Transforms["Member"] & {
  createdAt: string;
  profileImage: string | null;
};

async function onError(error: Error) {
  await showFailureToast(error.message);
}
export default function ManageMembers() {
  const {
    isLoading,
    data: members,
    revalidate,
    mutate,
  } = useCachedPromise(
    () => async (options) => {
      const res = (await memberstack.members.list({
        after: options.cursor,
        limit: 20,
      })) as PaginatedPayload<Member>;
      return {
        data: res.data,
        hasMore: res.hasMore,
        cursor: res.endCursor,
      };
    },
    [],
    {
      onError,
      initialData: [],
    },
  );

  async function confirmAndDelete(member: Member) {
    const options: Alert.Options = {
      icon: { source: Icon.RemovePerson, tintColor: Color.Red },
      title: "Delete Member?",
      message: member.auth.email,
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete",
      },
    };

    if (await confirmAlert(options)) {
      const toast = await showToast(Toast.Style.Animated, "Deleting", member.auth.email);
      try {
        await mutate(memberstack.members.delete({ id: member.id }), {
          optimisticUpdate(data) {
            return data.filter((m) => m.id !== member.id);
          },
          shouldRevalidateAfter: false,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Deleted";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = (error as Error).message;
      }
    }
  }

  return (
    <List isLoading={isLoading} isShowingDetail>
      {members.map((member) => (
        <List.Item
          key={member.id}
          icon={member.profileImage ?? getAvatarIcon(member.auth.email)}
          title={member.auth.email}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="ID" text={member.id} />
                  <List.Item.Detail.Metadata.Link
                    title="Email"
                    text={member.auth.email}
                    target={`mailo:${member.auth.email}`}
                  />
                  <List.Item.Detail.Metadata.Label title="Created At" text={member.createdAt} />
                  <List.Item.Detail.Metadata.Label title="Verified" icon={member.verified ? Icon.Check : Icon.Xmark} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Pencil}
                title="Update Member"
                target={<UpdateMember member={member} onUpdate={revalidate} />}
              />
              <Action.Push
                icon={Icon.Plus}
                title="Create Member (free Plan)"
                target={<CreateMember onCreate={revalidate} />}
              />
              <Action
                icon={Icon.RemovePerson}
                title="Delete Member"
                onAction={() => confirmAndDelete(member)}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function UpdateMember({ member, onUpdate }: { member: Member; onUpdate: () => void }) {
  const [execute, setExecute] = useState(false);
  const { pop } = useNavigation();
  const { itemProps, handleSubmit, values } = useForm<Params.UpdateMember["data"]>({
    onSubmit() {
      setExecute(true);
    },
    initialValues: {
      email: member.auth.email,
      verified: member.verified,
    },
  });

  const { isLoading } = usePromise(
    async () =>
      await memberstack.members.update({
        id: member.id,
        data: values,
      }),
    [],
    {
      execute,
      onData() {
        onUpdate();
        pop();
      },
      onError(error) {
        onError(error);
        setExecute(false);
      },
    },
  );

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Update" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={member.auth.email} />
      <Form.TextField title="Email" placeholder="members-updated-email@test.com" {...itemProps.email} />
      <Form.Checkbox label="Verified" {...itemProps.verified} />
    </Form>
  );
}
function CreateMember({ onCreate }: { onCreate: () => void }) {
  const [execute, setExecute] = useState(false);
  const { pop } = useNavigation();
  const { itemProps, handleSubmit, values } = useForm<Params.CreateMember>({
    onSubmit() {
      setExecute(true);
    },
    validation: {
      email: FormValidation.Required,
      password: FormValidation.Required,
    },
  });

  const { isLoading } = usePromise(async () => await memberstack.members.create(values), [], {
    execute,
    onData() {
      onCreate();
      pop();
    },
    onError(error) {
      onError(error);
      setExecute(false);
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Update" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Email" placeholder="john2@doe.com" {...itemProps.email} />
      <Form.PasswordField title="Password" placeholder="123123123" {...itemProps.password} />
    </Form>
  );
}
