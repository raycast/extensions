import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { loadOrgs } from "../../utils";
import { Dispatch, useEffect, useState } from "react";
import {
  MISC_ORGS_SECTION_LABEL,
  NEW_SECTION_LABEL,
  HEX_REGEX,
  COLOR_WARNING_MESSAGE,
  DEFAULT_COLOR,
  PATH_OPTIONS,
  CUSTOM_KEY,
  HOME_PATH,
  SETUP_PATH,
  ORG_LABEL_LABEL,
  ORG_ALIAS_DESCRIPTION,
  ORG_LABEL_PLACEHOLDER,
  COLOR_LABEL,
  COLOR_DESCRIPTION,
  OPEN_TO_DESCRIPTION,
  OPEN_TO_LABEL,
  CUSTOM_PATH_LABEL,
  CUSTOM_PATH_DESCRIPTION,
  CUSTOM_PATH_PLACEHOLDER,
  SECTION_LABEL,
  SECTION_DESCRIPTION,
  NEW_SECTION_NAME_LABEL,
  NEW_SECTION_DESCRIPTION,
} from "../../constants";
import { OrgListReducerAction, OrgListReducerType, DeveloperOrg, AuthenticateNewOrgFormData } from "../../types";
import { FormValidation, useForm } from "@raycast/utils";

export function DeveloperOrgDetails(props: { org: DeveloperOrg; dispatch: Dispatch<OrgListReducerAction> }) {
  const { org, dispatch } = props;
  const [section, setSection] = useState<string>();
  const [sections, setSections] = useState<string[]>([]);
  const [paths, setPaths] = useState<{ value: string; key: string }[]>([]);
  const [path, setPath] = useState<string>(HOME_PATH);
  const { pop } = useNavigation();

  const setSectionValue = (section: string) => {
    setSection(section);
    setValue("section", section);
  };

  const setPathValue = (path: string) => {
    setPath(path);
    setValue("openToPath", path);
  };

  useEffect(() => {
    async function getSectionList() {
      const storedOrgs = await loadOrgs();
      const sects = new Set<string>();
      if (storedOrgs) {
        for (const org of storedOrgs!) {
          if (org.section) sects.add(org.section);
        }
        const sectionNames = [...new Set([MISC_ORGS_SECTION_LABEL, ...Array.from(sects), NEW_SECTION_LABEL])];
        setSections(sectionNames);
        setSectionValue(org.section ?? MISC_ORGS_SECTION_LABEL);
      }
      setPaths(PATH_OPTIONS);
      //If openToPath is populated, check if it is HOME or SETUP. If so, use that as the picklist option.
      //If open to Path is populated but not SETUP or HOME, use the Custom key. Otherwise, if openToPath is not populated, default to HOME
      const pathToOpen =
        org.openToPath && (org.openToPath === HOME_PATH || org.openToPath === SETUP_PATH)
          ? org.openToPath
          : org.openToPath
            ? CUSTOM_KEY
            : HOME_PATH;
      setPathValue(pathToOpen);
    }
    setValue("color", org.color ?? DEFAULT_COLOR);
    setValue("label", org.label ?? "");
    setValue(
      "customPath",
      org.openToPath !== undefined && (org.openToPath === HOME_PATH || org.openToPath === SETUP_PATH)
        ? ""
        : org.openToPath,
    );
    getSectionList();
  }, []);

  const title = org.label && org.label !== "" ? org.label : org.alias;

  const { handleSubmit, itemProps, setValue } = useForm<AuthenticateNewOrgFormData>({
    onSubmit(values: AuthenticateNewOrgFormData) {
      const updatedOrg = {
        ...org,
        ...values,
      };
      if (values.newSectionName) {
        updatedOrg.section = values.newSectionName;
      }
      if (values.customPath) {
        updatedOrg.openToPath = values.customPath;
      }
      dispatch({
        type: OrgListReducerType.UPDATE_ORG,
        updatedOrg: updatedOrg,
      });
      pop();
    },
    validation: {
      color: (value) => {
        if (!value || !HEX_REGEX.test(value)) {
          return COLOR_WARNING_MESSAGE;
        }
      },
      section: FormValidation.Required,
      newSectionName: section === NEW_SECTION_LABEL ? FormValidation.Required : undefined,
      openToPath: FormValidation.Required,
      customPath: (value) => {
        if (path === CUSTOM_KEY) {
          if (!value) {
            return "This item is required";
          } else if (value.charAt(0) !== "/") {
            return "Only relative paths are allowed. Make sure your path starts with '/'.";
          }
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={{ source: Icon.HardDrive }} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="" text={`Update ${title}`} />
      <Form.Description title="Org URL" text={org.instanceUrl} />
      <Form.Description title="Username" text={org.username} />
      <Form.Description title="Org Alias" text={org.alias} />
      {org.expirationDate && (
        <Form.Description
          title="Expiration Date"
          text={(() => {
            const [year, month, day] = org.expirationDate.split("-").map(Number);
            const date = new Date(year, month - 1, day); // month is 0-based in JS
            return date.toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            });
          })()}
        />
      )}
      <Form.TextField
        title={ORG_LABEL_LABEL}
        {...itemProps.label}
        info={ORG_ALIAS_DESCRIPTION}
        placeholder={ORG_LABEL_PLACEHOLDER}
      />
      <Form.TextField title={COLOR_LABEL} {...itemProps.color} info={COLOR_DESCRIPTION} />
      <Form.Dropdown
        info={OPEN_TO_DESCRIPTION}
        title={OPEN_TO_LABEL}
        {...itemProps.openToPath}
        value={path}
        onChange={setPathValue}
      >
        {paths.map((pathOption, index) => (
          <Form.Dropdown.Item key={index} value={pathOption.value} title={pathOption.key} />
        ))}
      </Form.Dropdown>
      {path === CUSTOM_KEY ? (
        <Form.TextField
          {...itemProps.customPath}
          title={CUSTOM_PATH_LABEL}
          placeholder={CUSTOM_PATH_PLACEHOLDER}
          info={CUSTOM_PATH_DESCRIPTION}
        />
      ) : undefined}
      <Form.Dropdown title={SECTION_LABEL} {...itemProps.section} onChange={setSectionValue} info={SECTION_DESCRIPTION}>
        {sections.map((sect, index) => (
          <Form.Dropdown.Item key={index} value={sect} title={sect} />
        ))}
      </Form.Dropdown>
      {section === NEW_SECTION_LABEL ? (
        <Form.TextField title={NEW_SECTION_NAME_LABEL} info={NEW_SECTION_DESCRIPTION} {...itemProps.newSectionName} />
      ) : undefined}
    </Form>
  );
}
