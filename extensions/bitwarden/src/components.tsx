import {
  ActionPanel,
  copyTextToClipboard,
  CopyToClipboardAction,
  Detail,
  Form,
  Icon,
  popToRoot,
  PushAction,
  showHUD,
  showToast,
  SubmitFormAction,
  ToastStyle
} from "@raycast/api";
import { Bitwarden } from "./api";
import { Dispatch, Fragment, SetStateAction, useEffect, useState } from "react";
import { Field, Folder, Item, PassphraseOptions, PasswordOptions, Uris } from "./types";

export function TroubleshootingGuide(): JSX.Element {
  showToast(ToastStyle.Failure, "Bitwarden CLI not found");
  const markdown = `# The Bitwarden CLI was not found
## Please check that:

1. The Bitwarden CLI is [correctly installed](https://bitwarden.com/help/article/cli/#download-and-install)
1. If you did not install bitwarden using brew, please check that path of the installation matches the \`Bitwarden CLI Installation Path\` extension setting
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <CopyToClipboardAction title={"Copy Homebrew Installation Command"} content="brew install bitwarden-cli" />
        </ActionPanel>
      }
    />
  );
}

export function UnlockForm(props: {
  setSessionToken: (session: string) => void;
  bitwardenApi: Bitwarden;
}): JSX.Element {
  async function onSubmit(values: { password: string }) {
    try {
      const toast = await showToast(ToastStyle.Animated, "Unlocking Vault...", "Please wait");
      const sessionToken = await props.bitwardenApi.unlock(values.password);
      toast.hide();

      props.setSessionToken(sessionToken);
    } catch (error) {
      showToast(ToastStyle.Failure, "Failed to unlock vault", "Invalid credentials");
    }
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Unlock" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.PasswordField id="password" title="Master Password" />
    </Form>
  );
}

function ActionList(props: {
  submitForm: (input: any) => void;
  form: "login" | "card" | "identity" | "secureNote";
  bitwardenApi: Bitwarden;
  sessionToken: string | undefined
}) {
  const { bitwardenApi, sessionToken } = props;
  return <ActionPanel>
    <SubmitFormAction title={"Save Record"} onSubmit={props.submitForm} icon={Icon.Document} />
    {props.form != "login" &&
      <PushAction title={"Add Login"}
                  icon={Icon.Globe}
                  target={<LoginForm bitwardenApi={bitwardenApi} sessionToken={sessionToken} />} />}
    {props.form != "card" &&
      <PushAction title={"Add Card"}
                  icon={Icon.List}
                  target={<CardForm bitwardenApi={bitwardenApi} sessionToken={sessionToken} />} />}
    {props.form != "secureNote" &&
      <PushAction title={"Add Secure Note"}
                  icon={Icon.TextDocument}
                  target={<SecureNoteForm bitwardenApi={bitwardenApi} sessionToken={sessionToken} />} />}
    {props.form != "identity" &&
      <PushAction title={"Add Identity"}
                  icon={Icon.Person}
                  target={<IdentityForm bitwardenApi={bitwardenApi} sessionToken={sessionToken} />} />}
  </ActionPanel>;
}

function AdditionalOptions(props: {
  bitwardenApi: Bitwarden;
  sessionToken?: string;
  setFieldCount: Dispatch<SetStateAction<number>>
}) {
  const { sessionToken, bitwardenApi, setFieldCount } = props;
  const [folders, setFolders] = useState<Folder[]>([{ id: null, name: "No Folder", object: "folder" }]);
  const [fields, setFields] = useState<Field[]>([]);
  useEffect(() => {
    async function getFolders() {
      if (sessionToken) {
        const response = await bitwardenApi.listItems<Folder>("folders", sessionToken);
        setFolders(response);
      }
    }

    getFolders();
  }, [sessionToken]);

  return <Fragment key={"additionalOptions"}>
    <Form.Dropdown id={"folder"} title={"Folder"}>
      {folders.map((folder, i) => {
        return <Form.DropdownItem value={folder.id ?? ""} key={"folder" + i} title={folder.name} />;
      })
      }
    </Form.Dropdown>
    <Form.Checkbox id={"favorite"} label={"Favorite"} />
    <Form.Checkbox id={"reprompt"} label={"Master password re-prompt"} />
    <Form.Separator />
    <Form.TextArea id={"notes"} title={"Notes"} />
    <Form.Separator />
    <Form.Checkbox label={"Add Custom Field"} id={"addField"}
                   onChange={e => {
                     if (e) {
                       setFieldCount(prev => prev + 1);
                       setFields(prev => [...prev, { value: "", type: 1, name: "" }]);
                     }
                   }} defaultValue={false} value={false} />
    {fields.map((field, i) => {
      return <Fragment key={"field" + i}>
        <Form.TextField id={"fieldName" + i} title={"Field Name"} />
        <Form.TextField id={"fieldValue" + i} title={"Field Value"} />
        <Form.Dropdown id={"fieldType" + i} title={"Field Type"}>
          <Form.DropdownItem value={"0"} title={"Text"} />
          <Form.DropdownItem value={"1"} title={"Hidden"} />
          <Form.DropdownItem value={"2"} title={"Boolean"} />
        </Form.Dropdown>
      </Fragment>;
    })}
  </Fragment>;
}

async function submitForm(e: any, bitwardenApi: Bitwarden, sessionToken?: string) {
  const toast = await showToast(ToastStyle.Animated, "Bitwarden", "Submitting Your Item");

  //check required field
  if (!e.name) {
    await toast.hide();
    await showToast(ToastStyle.Failure, "Bitwarden", "Name Field is Required");
    return;
  }
  const item: Item = {
    collectionIds: [],
    favorite: e.favorite == 1,
    folderId: e.folder,
    id: "",
    name: e.name,
    notes: e.notes,
    object: "item",
    organizationId: null,
    reprompt: e.reprompt ? 1 : 0,
    revisionDate: "",
    type: e.type,
    fields: []
  };

  for (let i = 0; i < e.fieldCount; i++) {
    item.fields?.push({
      value: e["fieldValue" + i],
      type: e["fieldType" + i],
      name: e["fieldName" + i]
    });
  }
  switch (item.type) {
    case 1:
      item.login = {
        username: e.userName,
        password: e.password,
        totp: e.otp,
        passwordRevisionDate: "",
        uris: []
      };
      for (let i = 0; i < e.uriCount; i++) {
        item.login?.uris?.push({ uri: e["uri" + i], match: e["uriMatch" + i] });
      }
      break;
    case 2:
      item.secureNote = { type: 0 };
      break;
    case 3:
      item.card = {
        brand: e.brand,
        cardholderName: e.cardholderName,
        code: e.code,
        expMonth: e.expirationDate && ((e.expirationDate as Date).getMonth() + 1).toString(),
        expYear: e.expirationDate && (e.expirationDate as Date).getFullYear().toString(),
        number: e.number
      };
      break;
    case 4:
      item.identity = {
        title: e.title,
        firstName: e.firstName,
        middleName: e.middleName,
        lastName: e.lastName,
        address1: e.address1,
        address2: e.address2,
        address3: e.address3,
        city: e.city,
        state: e.state,
        postalCode: e.postalCode,
        country: e.country,
        company: e.company,
        email: e.email,
        phone: e.phone,
        ssn: e.ssn,
        username: e.username,
        passportNumber: e.passportNumber,
        licenseNumber: e.licenseNumber
      };
  }
  try {
    if (sessionToken) {
      const response: Item = await bitwardenApi.create(sessionToken, Buffer.from(JSON.stringify(item), "utf-8").toString("base64"));
      if (e.type == 1 && response.login?.password) {
        await copyTextToClipboard(response.login.password);
        await showHUD("Password Copied to Clipboard");
      }
      await toast.hide();
      await showToast(ToastStyle.Success, "Bitwarden", "Record Successfully Saved");
      await popToRoot();
    }
  } catch (e) {
    await toast.hide();
    await showToast(ToastStyle.Failure, "Bitwarden", "Your Form Wasn't Saved");
  }
}

export function LoginForm(props: {
  bitwardenApi: Bitwarden;
  sessionToken?: string
}) {
  const { sessionToken, bitwardenApi } = props;
  const [options, setOptions] = useState<PasswordOptions>({
    len: 15,
    uppercase: false,
    lowercase: false,
    numeric: false,
    special: false
  });
  const [passphraseOptions, setPassphraseOptions] = useState<PassphraseOptions>({
    wordsLen: 0,
    separator: "",
    capitalize: false,
    numbers: false
  });
  const [passOpt, setPassOpt] = useState<string>("none");
  const [additionalOptions, setAdditionalOptions] = useState<boolean>(false);
  const [pass, setPass] = useState<string>("");
  const [uris, setUris] = useState<Uris[]>([]);
  const [uriCount, setUriCount] = useState<number>(0);
  const [fieldCount, setFieldCount] = useState<number>(0);

  async function genPassword(opts: PasswordOptions | PassphraseOptions) {
    setPass(await bitwardenApi.generate(opts));
  }

  return <Form navigationTitle={"Add Login 🧍"} isLoading={sessionToken == null}
               actions={
                 <ActionList submitForm={e => {
                   // login form type
                   e.type = 1;
                   //needed to re-map form values to array
                   e.uriCount = uriCount;
                   e.fieldCount = fieldCount;
                   submitForm(e, bitwardenApi, sessionToken);
                 }} form={"login"}
                             bitwardenApi={bitwardenApi}
                             sessionToken={sessionToken} />
               }>
    {sessionToken && <Fragment>
      <Form.Description text={"Create login"} />
      <Form.TextField id={"name"} title={"Name"} />
      <Form.TextField id={"userName"} title={"User Name"} />
      <Form.TextField id={"otp"} title={"Authenticator key (TOTP)"} />
      <Form.TextField id={"password"} title={"Password"} value={pass} onChange={setPass} />
      <Form.Dropdown id={"gen"} title={"Password Options"} onChange={e => {
        switch (e) {
          case "password":
            setPassOpt(e);
            genPassword(options);
            break;
          case "passphrase":
            setPassOpt(e);
            genPassword(passphraseOptions);
            break;
          default:
            setPassOpt(e);
        }
      }}>
        <Form.DropdownItem value={"none"} title={"Manual"} />
        <Form.DropdownItem value={"password"} title={"Password"} />
        <Form.DropdownItem value={"passphrase"} title={"Passphrase"} />
      </Form.Dropdown>
      {passOpt == "password" &&
        <Fragment key={"passwordOptions"}>
          <Form.TextField id={"passLen"} title={"Password Length"} onChange={e => {
            if (options.len != +e) {
              options.len = +e;
              setOptions(options);
              genPassword(options);
            }
          }} storeValue={true} />
          <Form.Checkbox label={"a-z"} id={"lowercase"} onChange={e => {
            if (options.lowercase != e) {
              options.lowercase = e;
              setOptions(options);
              genPassword(options);
            }
          }} storeValue={true} />
          <Form.Checkbox label={"A-Z"} id={"uppercase"} onChange={e => {
            if (options.uppercase != e) {
              options.uppercase = e;
              setOptions(options);
              genPassword(options);
            }
          }} storeValue={true} />
          <Form.Checkbox label={"0-9"} id={"numeric"} onChange={e => {
            if (options.numeric != e) {
              options.numeric = e;
              setOptions(options);
              genPassword(options);
            }
          }} storeValue={true} />
          <Form.Checkbox label={"!@#$%^"} id={"special"} onChange={e => {
            if (options.special != e) {
              options.special = e;
              setOptions(options);
              genPassword(options);
            }
          }} storeValue={true} />
        </Fragment>
      }
      {passOpt == "passphrase" &&
        <Fragment key={"passphraseOptions"}>
          <Form.TextField id={"words"} title={"Number Of Words"} onChange={e => {
            if (passphraseOptions.wordsLen != +e) {
              passphraseOptions.wordsLen = +e;
              setPassphraseOptions(passphraseOptions);
              genPassword(passphraseOptions);
            }
          }} storeValue={true} />
          <Form.TextField id={"separator"} title={"Words separator"} onChange={e => {
            if (passphraseOptions.separator != e) {
              passphraseOptions.separator = e;
              setPassphraseOptions(passphraseOptions);
              genPassword(passphraseOptions);
            }
          }} storeValue={true} />
          <Form.Checkbox id={"capitalize"} label={"Capitalize"} onChange={e => {
            if (passphraseOptions.capitalize != e) {
              passphraseOptions.capitalize = e;
              setPassphraseOptions(passphraseOptions);
              genPassword(passphraseOptions);
            }
          }} storeValue={true} />
          <Form.Checkbox id={"numbers"} label={"Include Numbers"} onChange={e => {
            if (passphraseOptions.numbers != e) {
              passphraseOptions.numbers = e;
              setPassphraseOptions(passphraseOptions);
              genPassword(passphraseOptions);
            }
          }} storeValue={true} />
        </Fragment>
      }
      <Form.Separator />
      <Form.Checkbox label={"Add URI"} id={"addUri"}
                     onChange={e => {
                       if (e) {
                         setUriCount(prev => prev + 1);
                         setUris(prev => [...prev, { match: null, uri: "" }]);
                       }
                     }} defaultValue={false} value={false} />
      {uris.map((uri, i) => {
        return <Fragment key={"fu" + i}>
          <Form.TextField id={"uri" + i} title={"Uri " + (i + 1)} />
          <Form.Dropdown id={"uriMatch" + i} title={"Match type"}>
            <Form.DropdownItem value={""} title={"Default Matching"} />
            <Form.DropdownItem value={"0"} title={"Domain"} />
            <Form.DropdownItem value={"1"} title={"Host"} />
            <Form.DropdownItem value={"2"} title={"Starts With"} />
            <Form.DropdownItem value={"3"} title={"Regular Expression"} />
            <Form.DropdownItem value={"5"} title={"Never"} />
          </Form.Dropdown>
        </Fragment>;

      })}
      <Form.Separator />
      <Form.Checkbox label={"Show Additional Options"} id={"additionalOptions"}
                     onChange={e => setAdditionalOptions(e)} value={additionalOptions} />
      {additionalOptions &&
        <AdditionalOptions bitwardenApi={bitwardenApi} sessionToken={sessionToken} setFieldCount={setFieldCount} />}
    </Fragment>
    }
  </Form>;

}

function CardForm(props: {
  bitwardenApi: Bitwarden;
  sessionToken?: string
}) {
  const { sessionToken, bitwardenApi } = props;
  const [fieldCount, setFieldCount] = useState<number>(0);
  return <Form navigationTitle={"Add Card 💳"}
               actions={
                 <ActionList submitForm={e => {
                   e.type = 3;
                   e.fieldCount = fieldCount;
                   submitForm(e, bitwardenApi, sessionToken);
                 }} form={"card"}
                             bitwardenApi={bitwardenApi}
                             sessionToken={sessionToken} />
               }>
    <Form.Separator />
    <Form.TextField id={"name"} title={"Name"} />
    <Form.TextField id={"cardholderName"} title={"Cardholder Name"} />
    <Form.TextField id={"number"} title={"Card Number"} />
    <Form.TextField id={"code"} title={"Secure Code"} />
    <Form.Dropdown id={"brand"} title={"Brand"}>
      <Form.DropdownItem value={"Visa"} title={"Visa"} />
      <Form.DropdownItem value={"Mastercard"} title={"Mastercard"} />
      <Form.DropdownItem value={"American Express"} title={"American Express"} />
      <Form.DropdownItem value={"Discover"} title={"Discover"} />
      <Form.DropdownItem value={"Diners Club"} title={"Diners Club"} />
      <Form.DropdownItem value={"JCB"} title={"JCB"} />
      <Form.DropdownItem value={"Maestro"} title={"Maestro"} />
      <Form.DropdownItem value={"UnionPay"} title={"UnionPay"} />
      <Form.DropdownItem value={"Other"} title={"Other"} />
    </Form.Dropdown>
    <Form.DatePicker id={"expirationDate"} title={"Expiration month"} />
    <Form.Separator />
    <AdditionalOptions bitwardenApi={bitwardenApi} sessionToken={sessionToken} setFieldCount={setFieldCount} />
  </Form>;
}

function SecureNoteForm(props: {
  bitwardenApi: Bitwarden;
  sessionToken?: string
}) {
  const { sessionToken, bitwardenApi } = props;
  const [fieldCount, setFieldCount] = useState<number>(0);
  return <Form navigationTitle={"Add Secure Note 📝"}
               actions={
                 <ActionList submitForm={e => {
                   e.type = 2;
                   e.fieldCount = fieldCount;
                   submitForm(e, bitwardenApi, sessionToken);
                 }}
                             form={"secureNote"}
                             bitwardenApi={bitwardenApi}
                             sessionToken={sessionToken} />
               }>
    <Form.TextField id={"name"} title={"Name"} />
    <AdditionalOptions bitwardenApi={bitwardenApi} sessionToken={sessionToken} setFieldCount={setFieldCount} />
  </Form>;
}

function IdentityForm(props: {
  bitwardenApi: Bitwarden,
  sessionToken?: string
}) {
  const { sessionToken, bitwardenApi } = props;
  const [fieldCount, setFieldCount] = useState<number>(0);
  const fields = ["firstName", "middleName", "lastName", "username", "company", "ssn", "passportNumber", "licenseNumber", "email", "phone", "address1", "address2", "address3", "city", "state", "postalCode", "country"];
  return <Form navigationTitle={"Add Identity 📝"}
               actions={
                 <ActionList submitForm={e => {
                   e.type = 4;
                   e.fieldCount = fieldCount;
                   submitForm(e, bitwardenApi, sessionToken);
                 }}
                             form={"secureNote"}
                             bitwardenApi={bitwardenApi}
                             sessionToken={sessionToken} />
               }>
    <Form.TextField id={"name"} title={"Name"} />
    <Form.Dropdown id={"title"} title={"Title"}>
      <Form.DropdownItem value={""} title={"-"} />
      <Form.DropdownItem value={"Mr"} title={"Mr"} />
      <Form.DropdownItem value={"Mrs"} title={"Mrs"} />
      <Form.DropdownItem value={"Ms"} title={"Ms"} />
      <Form.DropdownItem value={"Dr"} title={"Dr"} />
    </Form.Dropdown>
    {fields.map((field, i) => {
      const titleCase = field.replace(/([A-Z]|[0-9])/g, " $1");
      return <Form.TextField key={"iden" + i} id={field}
                             title={titleCase.charAt(0).toUpperCase() + titleCase.slice(1)} />;
    })}
    <Form.Separator />
    <AdditionalOptions bitwardenApi={bitwardenApi} sessionToken={sessionToken} setFieldCount={setFieldCount} />
  </Form>;
}