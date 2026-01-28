import {
  Action,
  ActionPanel,
  Icon,
  LaunchType,
  List,
  LocalStorage,
  Toast,
  launchCommand,
  showToast,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ValidatorStats } from "./types";

function ChangeValidatorCommand() {
  const { isLoading, data } = useFetch<ValidatorStats[]>("https://api.stakewiz.com/validators");

  return (
    <List isLoading={isLoading} isShowingDetail>
      {data
        ? data
            .sort((a, b) => b.activated_stake - a.activated_stake)
            ?.map((validator) => (
              <List.Item
                key={validator.identity}
                title={!validator.name?.length ? "Unknown" : validator.name}
                icon={validator.image ?? Icon.QuestionMarkCircle}
                detail={<ValidatorDetails validator={validator} />}
                actions={
                  <ActionPanel>
                    <Action
                      title="Select"
                      onAction={async () => {
                        LocalStorage.setItem(
                          "validator",
                          JSON.stringify({ address: validator.vote_identity, name: validator.name }),
                        ).then(() => {
                          showToast({
                            title: "Validator changed",
                            message: `Selected ${validator.name}`,
                            style: Toast.Style.Success,
                          });
                          launchCommand({ name: "menuBarStats", type: LaunchType.UserInitiated });
                        });
                      }}
                    />
                  </ActionPanel>
                }
              />
            ))
        : null}
    </List>
  );
}

type ValidatorDetailsProps = {
  validator: ValidatorStats;
};

function ValidatorDetails(props: ValidatorDetailsProps) {
  const { validator } = props;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Identity" text={validator.identity} />
          <List.Item.Detail.Metadata.Label title="Vote Identity" text={validator.vote_identity} />
          <List.Item.Detail.Metadata.Label
            title="Activated Stake"
            text={
              validator.activated_stake.toLocaleString(undefined, { maximumFractionDigits: 2 }) +
              " SOL  ( " +
              validator.stake_weight +
              "% )"
            }
          />
          <List.Item.Detail.Metadata.Label
            title="APY"
            text={validator.apy_estimate.toFixed(2) + "%"}
            icon={Icon.Coins}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Location" text={`${validator.ip_city}, ${validator.ip_country}`} />
          <List.Item.Detail.Metadata.Label title="IP & Datacenter" text={`${validator.tpu_ip} - ${validator.ip_org}`} />
          <List.Item.Detail.Metadata.Label
            title="Stake Concentrations"
            text={`${validator.asn_concentration.toFixed(2)}% ASN,  ${validator.tpu_ip_concentration.toFixed(2)}% IP,  ${validator.city_concentration.toFixed(2)}% City`}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Voting Rate" text={`${validator.credit_ratio}%`} />
          <List.Item.Detail.Metadata.Label title="Voting Success Rate" text={`${validator.vote_success}%`} />
          <List.Item.Detail.Metadata.Label title="Uptime (30d)" text={`${validator.uptime}%`} />
          <List.Item.Detail.Metadata.Separator />
          {validator.website && (
            <>
              <List.Item.Detail.Metadata.Link
                title="Website"
                text={`${validator.website}`}
                target={validator.website}
              />
              <List.Item.Detail.Metadata.Separator />
            </>
          )}
          <List.Item.Detail.Metadata.TagList title="Client">
            <List.Item.Detail.Metadata.TagList.Item
              text={validator.is_jito ? "Jito" : "Solana Labs"}
              color={"#eed535"}
            />
            <List.Item.Detail.Metadata.TagList.Item text={validator.version} color={"#93C5FD"} />
          </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function Command() {
  return <ChangeValidatorCommand />;
}
