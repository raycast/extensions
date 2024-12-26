import { Action, ActionPanel, Color, Detail, List } from '@raycast/api';
import dayjs from 'dayjs';
import { PluginLunar } from 'dayjs-plugin-lunar';
import isToday from 'dayjs/plugin/isToday';
import { useMemo, useState } from 'react';
import { CurrentTime } from './components/current-time';
import { DualHour } from './components/dual-hour';

dayjs.extend(PluginLunar);
dayjs.extend(isToday);

export default function LunarCalendarApp() {
  const [selectedDate, setSelectedDate] = useState(dayjs());

  const isCurrentDay = useMemo(() => selectedDate.isToday(), [selectedDate]);

  const lunarDate = useMemo(() => selectedDate.toLunarDay(), [selectedDate]);

  const luck = useMemo(() => lunarDate.getMinorRen().getLuck().getName(), [lunarDate]);

  const sixtyCycleInfo = useMemo(() => lunarDate.getSixtyCycle(), [lunarDate]);

  const earthBranch = useMemo(() => sixtyCycleInfo.getEarthBranch(), [sixtyCycleInfo]);

  const twentyEightStar = useMemo(() => lunarDate.getTwentyEightStar(), [lunarDate]);

  const recommends = useMemo(() => lunarDate.getRecommends(), [lunarDate]);
  const avoids = useMemo(() => lunarDate.getAvoids(), [lunarDate]);

  const { goodGods, badGods } = useMemo(() => {
    const goodGodList: string[] = [];
    const badGodList: string[] = [];
    lunarDate.getGods().forEach((god) => {
      god.getLuck().getName() === '吉' ? goodGodList.push(god.getName()) : badGodList.push(god.getName());
    });
    return { goodGods: goodGodList, badGods: badGodList };
  }, [lunarDate]);

  return (
    <List isShowingDetail>
      <List.Item
        title={selectedDate.format('LY年LMLD')}
        subtitle={isCurrentDay ? '今' : undefined}
        accessories={[
          {
            tag: {
              value: luck,
              color: luck === '吉' ? Color.Green : undefined,
            },
          },
        ]}
        detail={
          <List.Item.Detail
            metadata={
              <Detail.Metadata>
                <Detail.Metadata.Label title="公历" text={selectedDate.format('YYYY 年 M 月 D 日')} />
                <Detail.Metadata.Label title="农历" text={selectedDate.format('LY年LMLD')} />
                <Detail.Metadata.Separator />
                {recommends.length ? (
                  <Detail.Metadata.TagList title="宜">
                    {lunarDate.getRecommends().map((recommend) => (
                      <Detail.Metadata.TagList.Item
                        key={recommend.getName()}
                        text={recommend.getName()}
                        color={Color.Green}
                      />
                    ))}
                  </Detail.Metadata.TagList>
                ) : (
                  <Detail.Metadata.Label title="宜" text="-" />
                )}
                {avoids.length ? (
                  <Detail.Metadata.TagList title="忌">
                    {lunarDate.getAvoids().map((avoid) => (
                      <Detail.Metadata.TagList.Item
                        key={avoid.getName()}
                        text={avoid.getName()}
                        color={Color.SecondaryText}
                      />
                    ))}
                  </Detail.Metadata.TagList>
                ) : (
                  <Detail.Metadata.Label title="忌" text="-" />
                )}

                <Detail.Metadata.Separator />
                <Detail.Metadata.Label title="吉凶" text={luck} />
                <Detail.Metadata.Label title="五行" text={sixtyCycleInfo.getSound().toString()} />
                <Detail.Metadata.Label
                  title="冲煞"
                  text={`冲${earthBranch.getOpposite().getZodiac()}煞${earthBranch.getOminous()}`}
                />
                <Detail.Metadata.Label title="值神" text={lunarDate.getTwelveStar().toString()} />
                <Detail.Metadata.Label title="建除十二神" text={lunarDate.getDuty().toString()} />
                <Detail.Metadata.Label
                  title="二十八星宿"
                  text={`${twentyEightStar}${twentyEightStar.getSevenStar()}${twentyEightStar.getAnimal()}（${twentyEightStar.getLuck()}）`}
                />
                <Detail.Metadata.Label title="吉神宜趋" text={goodGods.join(' ')} />
                <Detail.Metadata.Label title="凶煞宜忌" text={badGods.join(' ')} />
                <Detail.Metadata.Label title="今日胎神" text={lunarDate.getFetusDay().toString()} />
                <Detail.Metadata.Label
                  title="彭祖百忌"
                  text={`${sixtyCycleInfo.getHeavenStem().getPengZuHeavenStem()} ${earthBranch.getPengZuEarthBranch()}`}
                />
              </Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            <Action.PickDate
              title="选择日期"
              onChange={(newDate) => {
                if (newDate) {
                  setSelectedDate(dayjs(newDate));
                }
              }}
            />
          </ActionPanel>
        }
      />

      {isCurrentDay && <CurrentTime />}

      <List.Section title="时辰">
        {Array.from({ length: 12 }).map((_, index) => {
          const dualHour = selectedDate.hour(index * 2);
          return <DualHour key={dualHour.format('YYYY-MM-DD-HH')} time={dualHour} />;
        })}
      </List.Section>
    </List>
  );
}
