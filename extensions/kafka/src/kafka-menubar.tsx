import {
  Cache,
  Clipboard,
  environment,
  getPreferenceValues,
  Icon,
  LaunchType,
  MenuBarExtra,
  openCommandPreferences,
} from "@raycast/api";
import { ConsumerGroupState, GroupDescription, GroupOverview } from "kafkajs";
import { useCallback, useEffect, useState } from "react";
import { useCachedState } from "@raycast/utils";
import { buildAdmin, getConfig, getConsumerInfo, getEnvs } from "./utils";
import moment from "moment";

type State = "Loaded" | "NotLoaded" | "Loading";

interface ConsumerInfo {
  groupId: string;
  state: ConsumerGroupState;
  members: number;
  overall: number;
}

interface KafkaMenuBarPreferences {
  hideWithoutLag: boolean;
}

const preferences = getPreferenceValues<KafkaMenuBarPreferences>();

const cacheNamespace = "kafka-menubar";
const cacheKeyLag = "kafkaLagConsumers";
const cacheKeyLastUpdate = "kafkaLagLastUpdate";
const cache = new Cache({ namespace: cacheNamespace });

export function MenuConsumer(props: { consumer: ConsumerInfo }) {
  return (
    <MenuBarExtra.Item
      title={props.consumer.groupId}
      subtitle={props.consumer.overall.toLocaleString()}
      onAction={async (event) =>
        await Clipboard.copy(event.type === "left-click" ? props.consumer.groupId : props.consumer.overall)
      }
    />
  );
}

export default function KafkaLag() {
  const [consumers, setConsumers] = useState<ConsumerInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [env, setEnv] = useCachedState("env", getEnvs()[0]);
  const [state, setState] = useCachedState<State>("state", "NotLoaded");

  const load = useCallback(
    async (launchType: LaunchType, env: string) => {
      const start = moment.now();
      if (launchType === LaunchType.UserInitiated) {
        const cached = cache.get(cacheKeyLag);
        if (cached) {
          const fromCache = JSON.parse(cached);
          setConsumers(fromCache);
        }
        return;
      }
      console.info("[background] get kafka consumers for env:", env);
      setIsLoading(true);
      setState("Loading");
      try {
        const admin = await buildAdmin(env);
        const filterConsumers = getConfig(env).filterConsumers;

        const groupIds = (await admin.listGroups()).groups
          .map((group: GroupOverview) => group.groupId)
          .filter((groupId) => {
            if (!filterConsumers) {
              return true;
            }
            return filterConsumers.some((filterConsumer) => groupId.includes(filterConsumer));
          });

        const groups = new Map<string, GroupDescription>(
          (await admin.describeGroups(groupIds)).groups.map((group) => [group.groupId, group])
        );

        let consumers: ConsumerInfo[] = [];
        // compute lag
        for (const groupId of groupIds) {
          const lagInfo = await getConsumerInfo(admin, groupId);
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const description = groups.get(groupId)!;
          consumers.push({
            groupId,
            state: description.state,
            members: description.members.length,
            overall: lagInfo.overallLag,
          });
        }

        consumers = consumers.sort((a, b) => {
          if (b.overall === a.overall) {
            return a.groupId.localeCompare(b.groupId);
          }
          return b.overall - a.overall;
        });

        cache.set(cacheKeyLag, JSON.stringify(consumers));
        cache.set(cacheKeyLastUpdate, moment(new Date()).format("HH:mm:ss"));
        setState("Loaded");
        setConsumers(consumers);
      } catch (e) {
        console.error("Unable to get kafka consumers", e);
      } finally {
        setIsLoading(false);
        console.info(`[background] done in ${moment.utc(moment.now() - start).format("mm:ss.SSS")}`);
      }
    },
    [setState]
  );

  useEffect(() => {
    load(environment.launchType, env).finally(() => setIsLoading(false));
  }, [env, load, setIsLoading]);

  return (
    <MenuBarExtra icon="kafka-dark.png" tooltip="Kafka lag" isLoading={isLoading}>
      <MenuBarExtra.Item
        title={`--- Kafka Lag ---${
          cache.has(cacheKeyLastUpdate) ? "  (last update : " + cache.get(cacheKeyLastUpdate) + ")" : ""
        }`}
      />
      <MenuBarExtra.Submenu title={"Environment (current : " + env + ")"} icon={Icon.Gauge}>
        {getEnvs().map((e) => (
          <MenuBarExtra.Item
            key={e}
            title={`${e}${e === env ? " ✓" : ""}`}
            onAction={() => {
              setConsumers([]);
              cache.remove(cacheKeyLag);
              setState("NotLoaded");
              setEnv(e);
            }}
          />
        ))}
      </MenuBarExtra.Submenu>
      <MenuBarExtra.Item title={"Configuration"} icon={Icon.Gear} onAction={openCommandPreferences} />
      {state !== "Loading" && (
        <MenuBarExtra.Item
          title={state === "NotLoaded" ? "Not yet loaded, click to force reload" : "Force reload"}
          icon={Icon.Clock}
          onAction={async () => {
            setIsLoading(true);
            await load(LaunchType.Background, env).finally(() => setIsLoading(false));
          }}
        />
      )}
      {state === "Loading" && <MenuBarExtra.Item title={"Loading..."} icon={Icon.Clock} />}
      {consumers.length > 0 && (
        <>
          <MenuBarExtra.Item title={"--- Group ids with lag ---"} />
          {consumers.filter((consumer) => consumer.overall > 0).length === 0 && (
            <MenuBarExtra.Item
              title={"No consumers with lag"}
              onAction={() => {
                console.info("No consumers with lag");
              }}
            />
          )}
          {consumers
            .filter((consumer) => consumer.overall > 0)
            .map((consumer) => (
              <MenuConsumer key={consumer.groupId} consumer={consumer} />
            ))}
          {!preferences.hideWithoutLag && (
            <>
              <MenuBarExtra.Item title="--- Group ids up to date ---" />
              {consumers
                .filter((consumer) => consumer.overall === 0)
                .map((consumer) => (
                  <MenuConsumer key={consumer.groupId} consumer={consumer} />
                ))}
            </>
          )}
        </>
      )}
    </MenuBarExtra>
  );
}
