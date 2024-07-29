import { Form } from "@raycast/api";
import { DeveloperOrg } from "../models/models";
import { loadOrgs, updateOrg } from "../utils/storage-management";
import { useEffect, useState } from "react";
import { MISC_ORGS_SECTION_LABEL, NEW_SECTION_LABEL } from "../utils/constants";

const HEX_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8}|[A-Fa-f0-9]{4})$/;

export function DeveloperOrgDetails(props: { org: DeveloperOrg; callback: () => Promise<void> }) {
  const [label, setLabel] = useState<string>(props.org.label ?? "");
  const [colorError, setColorError] = useState<string>();
  const [color, setColor] = useState<string>(props.org.color ?? "#0000FF");
  const [section, setSection] = useState<string>();
  const [showNewSelection, setShowNewSelection] = useState<boolean>(false);
  const [showNewSelectionError, setShowNewSelectionError] = useState<string>();
  const [sections, setSections] = useState<string[]>([]);

  useEffect(() => {
    async function getSectionList() {
      const storedOrgs = await loadOrgs();
      const sects = new Set<string>();
      if (storedOrgs) {
        for (const org of storedOrgs!) {
          if (org.section) sects.add(org.section);
        }
        console.log("FOUND SECTIONS: " + (Array.from(sects) as string[]));
        setSections([MISC_ORGS_SECTION_LABEL, ...Array.from(sects), NEW_SECTION_LABEL]);
        setSection(props.org.section ?? MISC_ORGS_SECTION_LABEL);
      }
    }
    getSectionList();
  }, []);

  const handleLabelChange = async (lbl: string) => {
    if (lbl !== props.org.label) {
      props.org.label = lbl;
      setLabel(lbl);
      await updateOrg(props.org);
      props.callback();
    }
  };

  const handleColorChange = async (clr: string) => {
    if (clr != props.org.color) {
      if (HEX_REGEX.test(clr)) {
        setColorError(undefined);
        (props.org.color = clr), setColor(clr);
        await updateOrg(props.org);
        props.callback();
      } else {
        setColor(clr);
        setColorError("Color must be a valid HEX Color. For example #0000FF for blue.");
      }
    }
  };

  const handleSectionChange = async (sect: string) => {
    if (sect !== props.org.section) {
      if (sect !== "New Section") {
        setShowNewSelection(false);
        setSection(sect);
        props.org.section = sect;
        await updateOrg(props.org);
        props.callback();
      } else {
        setSection(sect);
        setShowNewSelection(true);
      }
    }
  };

  const createNewSection = async (sect: string) => {
    if (sect) {
      setShowNewSelectionError(undefined);
      props.org.section = sect;
      await updateOrg(props.org);
      props.callback();
    } else {
      setShowNewSelectionError("Please enter a section name.");
    }
  };

  const title = `${props.org.label ?? ""} Details`;

  return (
    <Form>
      <Form.Description title={title} text="" />
      <Form.Description title="Org Alias" text={props.org.alias} />
      <Form.Description title="Org URL" text={props.org.instanceUrl} />
      <Form.TextField id="label" title="Label" value={label} onChange={handleLabelChange} />
      <Form.TextField
        id="color"
        title="Color (Hex Code)"
        error={colorError}
        value={color}
        onChange={handleColorChange}
      />
      <Form.Dropdown id="section" title="Section" defaultValue={section} onChange={handleSectionChange}>
        {sections.map((sect, index) => (
          <Form.Dropdown.Item key={index} value={sect} title={sect} />
        ))}
      </Form.Dropdown>
      {showNewSelection ? (
        <Form.TextField
          id="newSectionName"
          error={showNewSelectionError}
          title="New Section Name"
          onChange={createNewSection}
        />
      ) : undefined}
    </Form>
  );
}
