import { ActionPanel, Form, Icon, showToast, Action, Toast } from "@raycast/api";
import { useState } from "react";

interface FormValues {
  nameField: string;
  bioTextArea: string;
  datePicker: string;
  checkbox: boolean;
  dropdown: string;
  tagPicker: string;
}

export default function Command() {
  const [isCustomGender, setCustomGender] = useState<boolean>(false);

  function handleSubmit(values: FormValues) {
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
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="nameField" title="Full Name" placeholder="Enter your name" />
      <Form.TextArea id="bioTextArea" title="Add Bio" placeholder="Describe who you are" />
      <Form.DatePicker id="birthDate" title="Date of Birth" />
      <Form.PasswordField id="password" title="New Password" />
      <Form.Separator />
      <Form.Dropdown id="gender" title="Gender" defaultValue="female" onChange={genderChanged}>
        <Form.Dropdown.Item value="male" title="Male" icon={"🙍‍♂️"} />
        <Form.Dropdown.Item value="female" title="Female" icon={"👩"} />
        <Form.Dropdown.Item value="custom" title="Custom" icon={Icon.Person} />
      </Form.Dropdown>
      {isCustomGender && (
        <>
          <Form.Dropdown id="custom_gender" title="Custom Gender">
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
      <Form.TagPicker id="hobbies">
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
      <Form.Checkbox id="notificationsNewsletter" title="In-app" label="Newsletter" storeValue />
      <Form.Checkbox id="notificationsFriendsRequest" label="Friends Requests" storeValue />
      <Form.Checkbox id="notificationsMentions" title="Email" label="Mentions" storeValue />
      <Form.Checkbox id="notificationsEvents" label="Events" storeValue />
      <Form.Checkbox id="notificationsComments" label="New Comments" storeValue />
    </Form>
  );
}
