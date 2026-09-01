import { Action, ActionPanel, Color, Icon, List, type Image } from "@raycast/api";
import type { ReactNode } from "react";
import CreateCreative from "./components/CreateCreative";
import { CreateWithTemplate } from "./components/CreateWithTemplate";
import { useCredentialsGuard } from "./components/MissingCredentials";
import ManageTemplates from "./components/ManageTemplates";
import { AdList, AdSetList, CampaignList, CreativeList } from "./components/ResourceScreens";
import SetupCredentials from "./components/SetupCredentials";

function MenuItem({
  title,
  subtitle,
  icon,
  target,
  accessories,
}: {
  title: string;
  subtitle: string;
  icon: Image.ImageLike;
  target: ReactNode;
  accessories?: List.Item.Props["accessories"];
}) {
  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      icon={icon}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push title={title} icon={icon} target={target} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { isReady, isLoading, credentials } = useCredentialsGuard();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="메뉴 검색">
      {!isReady && !isLoading ? (
        <List.Section title="먼저 설정하세요">
          <MenuItem
            title="자격 증명 설정"
            subtitle="ACCESS_TOKEN과 광고 계정이 없습니다. 먼저 저장하세요."
            icon={{ source: Icon.Key, tintColor: Color.Orange }}
            accessories={[{ tag: { value: "필요", color: Color.Orange } }]}
            target={<SetupCredentials />}
          />
        </List.Section>
      ) : null}
      <List.Section title="조회">
        <MenuItem title="캠페인" subtitle="광고 계정의 캠페인 조회" icon={Icon.Megaphone} target={<CampaignList />} />
        <MenuItem title="광고세트" subtitle="광고 계정의 광고세트 조회" icon={Icon.Layers} target={<AdSetList />} />
        <MenuItem title="광고" subtitle="광고 계정의 광고 조회" icon={Icon.AppWindow} target={<AdList />} />
        <MenuItem
          title="크리에이티브"
          subtitle="광고 계정의 크리에이티브 조회"
          icon={Icon.Image}
          target={<CreativeList />}
        />
      </List.Section>
      <List.Section title="만들기">
        <MenuItem
          title="캠페인 만들기"
          subtitle="템플릿을 선택한 뒤 캠페인을 만듭니다"
          icon={Icon.Plus}
          target={<CreateWithTemplate kind="campaign" />}
        />
        <MenuItem
          title="광고세트 만들기"
          subtitle="템플릿을 선택한 뒤 광고세트를 만듭니다"
          icon={Icon.Plus}
          target={<CreateWithTemplate kind="adset" />}
        />
        <MenuItem
          title="광고 만들기"
          subtitle="템플릿을 선택한 뒤 광고를 만듭니다"
          icon={Icon.Plus}
          target={<CreateWithTemplate kind="ad" />}
        />
        <MenuItem
          title="크리에이티브 만들기"
          subtitle="이미지 또는 영상을 업로드해 광고 크리에이티브를 만듭니다"
          icon={Icon.Upload}
          target={<CreateCreative />}
        />
      </List.Section>
      <List.Section title="설정">
        <MenuItem
          title="템플릿 관리"
          subtitle="캠페인, 광고세트, 광고 생성 템플릿을 만들고 수정합니다"
          icon={Icon.Document}
          target={<ManageTemplates />}
        />
        {isReady ? (
          <MenuItem
            title="자격 증명 설정"
            subtitle={credentials?.adAccountId ?? "ACCESS_TOKEN을 저장하고 광고 계정을 선택합니다"}
            icon={Icon.Key}
            target={<SetupCredentials />}
          />
        ) : null}
      </List.Section>
    </List>
  );
}
