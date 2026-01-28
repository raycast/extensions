import { ActionPanel, Form, Icon, showToast, Action, Toast } from "@raycast/api";
import { useState } from "react";

interface MyValues {
  nameField?: string;
  bioTextArea?: string;
  birthDate?: Date;
  password?: string;
  gender?: string;
  custom_gender?: string;
  hobbies?: string[];
  notificationsNewsletter?: boolean;
}

export default function Command(props: { draftValues?: MyValues }) {
  const [isCustomGender, setCustomGender] = useState<boolean>(false);

  const draftValues = props.draftValues;

  function handleSubmit(values: MyValues) {
    console.log(values);
    showToast({
      style: Toast.Style.Success,
      title: "Submitted form",
      message: "See logs for submitted values",
    });
  }

  function genderChanged(genderValue: string) {
    setCustomGender(genderValue == "custom");
  }

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="nameField"
        title="Full Name"
        placeholder="Enter your name"
        defaultValue={draftValues?.nameField}
      />
      <Form.TextArea
        id="bioTextArea"
        title="Add Bio"
        placeholder="Describe who you are"
        defaultValue={draftValues?.bioTextArea}
      />
      <Form.DatePicker
        id="birthDate"
        title="Date of Birth"
        type={Form.DatePicker.Type.Date}
        defaultValue={draftValues?.birthDate}
      />
      <Form.PasswordField id="password" title="New Password" />
      <Form.Separator />
      <Form.Dropdown id="gender" title="Gender" defaultValue={draftValues?.gender ?? "female"} onChange={genderChanged}>
        <Form.Dropdown.Item value="male" title="Male" icon={"🙍‍♂️"} />
        <Form.Dropdown.Item value="female" title="Female" icon={"👩"} />
        <Form.Dropdown.Item value="custom" title="Custom" icon={Icon.Person} />
      </Form.Dropdown>
      {isCustomGender && (
        <>
          <Form.Dropdown id="custom_gender" title="Custom Gender" defaultValue={draftValues?.custom_gender}>
            <Form.Dropdown.Item value="she" title="She: 'Wish her a happy birthday!'" />
            <Form.Dropdown.Item value="he" title="He: 'Wish him a happy birthday!'" />
            <Form.Dropdown.Item value="they" title="They: 'Wish them a happy birthday!'" />
          </Form.Dropdown>
          <Form.Description text="Your pronoun is visible to everyone." />
        </>
      )}
      <Form.Separator />
      <Form.Description
        title="Add Hobbies"
        text="What do you love to do? Choose from the popular hobbies below or add others."
      />
      <Form.TagPicker id="hobbies" defaultValue={draftValues?.hobbies}>
        <Form.TagPicker.Item value="travelling" title="Travelling" icon="🌏" />
        <Form.TagPicker.Item value="listening_to_music" title="Listening to music" icon="🎧" />
        <Form.TagPicker.Item value="reading" title="Reading" icon="📖" />
        <Form.TagPicker.Item value="football" title="Football" icon="⚽" />
        <Form.TagPicker.Item value="video_Games" title="Video Games" icon="🎮" />
        <Form.TagPicker.Item value="watching_Films" title="Watching Films" icon="📽" />
        <Form.TagPicker.Item value="going_to_the_gym" title="Going to the gym" icon="👟" />
        <Form.TagPicker.Item value="eating" title="Eating" icon="🍕️" />
        <Form.TagPicker.Item value="cooking" title="Cooking" icon="🍳" />
        <Form.TagPicker.Item value="driving" title="Driving" icon="🚗" />
      </Form.TagPicker>
      <Form.Separator />
      <Form.Description
        title="Notifications"
        text="We may still send you important notifications about your account and content outside of your preferred notification settings."
      />
      <Form.Checkbox
        id="notificationsNewsletter"
        title="In-app"
        label="Newsletter"
        storeValue
        defaultValue={draftValues?.notificationsNewsletter}
      />
      <Form.Checkbox id="notificationsFriendsRequest" label="Friends Requests" storeValue />
      <Form.Checkbox id="notificationsMentions" title="Email" label="Mentions" storeValue />
      <Form.Checkbox id="notificationsEvents" label="Events" storeValue />
      <Form.Checkbox id="notificationsComments" label="New Comments" storeValue />
    </Form>
  );
}
