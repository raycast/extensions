import { CreateWithTemplate } from "./CreateWithTemplate";
import CreateCreative from "./CreateCreative";
import { ResourceList } from "./ResourceList";

export function CampaignList() {
  return (
    <ResourceList
      resource="campaign"
      newItem={{ title: "캠페인 만들기", target: <CreateWithTemplate kind="campaign" /> }}
      fromItem={{
        title: "이 캠페인으로 광고세트 만들기",
        target: (record) => <CreateWithTemplate kind="adset" initialValues={{ campaign_id: record.id }} />,
      }}
    />
  );
}

export function AdSetList() {
  return (
    <ResourceList
      resource="adset"
      newItem={{ title: "광고세트 만들기", target: <CreateWithTemplate kind="adset" /> }}
      fromItem={{
        title: "이 광고세트로 광고 만들기",
        target: (record) => <CreateWithTemplate kind="ad" initialValues={{ adset_id: record.id }} />,
      }}
    />
  );
}

export function AdList() {
  return <ResourceList resource="ad" newItem={{ title: "광고 만들기", target: <CreateWithTemplate kind="ad" /> }} />;
}

export function CreativeList() {
  return (
    <ResourceList
      resource="creative"
      newItem={{ title: "크리에이티브 만들기", target: <CreateCreative /> }}
      fromItem={{
        title: "이 크리에이티브로 광고 만들기",
        target: (record) => <CreateWithTemplate kind="ad" initialValues={{ creative_id: record.id }} />,
      }}
    />
  );
}
