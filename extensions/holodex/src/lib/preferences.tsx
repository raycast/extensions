import { getPreferenceValues, List } from "@raycast/api";
import { useEffect, useState } from "react";

export interface Preferences {
  apiKey: string;
  org: string;
  language: string;
  preferEnglishName: boolean;
  preferYouTube: boolean;
}

export function getPreferences() {
  return getPreferenceValues<Preferences>();
}

export function OrgDropdown({ defaultOrg, onChange }: { defaultOrg: string; onChange: (value: string) => void }) {
  const [org, setOrg] = useState<string>(defaultOrg);

  function _onChange(val: string) {
    setOrg(val);
  }

  useEffect(() => {
    onChange(org);
  }, [org]);

  return (
    <List.Dropdown tooltip="Select Organization" defaultValue={defaultOrg} onChange={_onChange}>
      {orgs.map((org) => (
        <List.Dropdown.Item key={org.value} title={org.title} value={org.value} />
      ))}
    </List.Dropdown>
  );
}

export const orgs = [
  {
    title: "All Vtubers",
    value: "All Vtubers",
  },
  {
    title: "Hololive",
    value: "Hololive",
  },
  {
    title: "Nijisanji",
    value: "Nijisanji",
  },
  {
    title: "Independents",
    value: "Independents",
  },
  {
    title: "Nori Pro",
    value: "Nori Pro",
  },
  {
    title: "VShojo",
    value: "VShojo",
  },
  {
    title: "VSpo",
    value: "VSpo",
  },
  {
    title: "Kizuna Ai Inc.",
    value: "Kizuna Ai Inc.",
  },
  {
    title: "Tsunderia",
    value: "Tsunderia",
  },
  {
    title: "PRISM",
    value: "PRISM",
  },
  {
    title: "774inc",
    value: "774inc",
  },
  {
    title: ".LIVE",
    value: ".LIVE",
  },
  {
    title: "ReACT",
    value: "ReACT",
  },
  {
    title: "VOMS",
    value: "VOMS",
  },
  {
    title: "KAMITSUBAKI",
    value: "KAMITSUBAKI",
  },
  {
    title: "Eilene Family",
    value: "Eilene Family",
  },
  {
    title: "Hoshimeguri Gakuen",
    value: "Hoshimeguri Gakuen",
  },
  {
    title: "Riot Music",
    value: "Riot Music",
  },
  {
    title: "ProPro",
    value: "ProPro",
  },
  {
    title: "WACTOR",
    value: "WACTOR",
  },
  {
    title: "Aogiri Highschool",
    value: "Aogiri Highschool",
  },
  {
    title: "Masquerade",
    value: "Masquerade",
  },
  {
    title: "Yuni Create",
    value: "Yuni Create",
  },
  {
    title: "Atelier Live",
    value: "Atelier Live",
  },
  {
    title: "VOICE-ORE",
    value: "VOICE-ORE",
  },
  {
    title: "ViViD",
    value: "ViViD",
  },
  {
    title: "Chukorara",
    value: "Chukorara",
  },
  {
    title: "X enc'ount",
    value: "X enc'ount",
  },
  {
    title: "Marbl_s",
    value: "Marbl_s",
  },
  {
    title: "Iridori",
    value: "Iridori",
  },
  {
    title: "Unreal Night Girls",
    value: "Unreal Night Girls",
  },
  {
    title: "V Dimension.Creators",
    value: "V Dimension.Creators",
  },
];
