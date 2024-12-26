import { Color, Detail, List } from '@raycast/api';
import dayjs from 'dayjs';

const dualHourRange = [
  '23:00 - 00:59',
  '01:00 - 02:59',
  '03:00 - 04:59',
  '05:00 - 06:59',
  '07:00 - 08:59',
  '09:00 - 10:59',
  '11:00 - 12:59',
  '13:00 - 14:59',
  '15:00 - 16:59',
  '17:00 - 18:59',
  '19:00 - 20:59',
  '21:00 - 22:59',
];

export const DualHour: React.FC<{
  time: dayjs.Dayjs;
  isCurrentTime?: boolean;
}> = ({ time, isCurrentTime }) => {
  const lunarHour = time.toLunarHour();
  const luck = lunarHour.getMinorRen().getLuck().getName();
  const sixtyCycle = lunarHour.getSixtyCycle();
  const heavenStem = sixtyCycle.getHeavenStem();
  const earthBranch = sixtyCycle.getEarthBranch();

  const recommends = lunarHour.getRecommends();
  const avoids = lunarHour.getAvoids();

  const handleDirection = (direction: string) => {
    const result = direction;
    switch (result) {
      case '东':
      case '南':
      case '西':
      case '北':
        return `正${result}`;
      default:
        return result;
    }
  };

  return (
    <List.Item
      title={{
        value: time.format(isCurrentTime ? 'LhLK' : 'LH'),
        tooltip: isCurrentTime ? time.format('HH:mm') : dualHourRange[lunarHour.getIndexInDay()],
      }}
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
              {recommends.length ? (
                <Detail.Metadata.TagList title="宜">
                  {recommends.map((item) => (
                    <Detail.Metadata.TagList.Item key={item.getName()} text={item.getName()} color={Color.Green} />
                  ))}
                </Detail.Metadata.TagList>
              ) : (
                <Detail.Metadata.Label title="宜" text="-" />
              )}
              {avoids.length ? (
                <Detail.Metadata.TagList title="忌">
                  {avoids.map((item) => (
                    <Detail.Metadata.TagList.Item
                      key={item.getName()}
                      text={item.getName()}
                      color={Color.SecondaryText}
                    />
                  ))}
                </Detail.Metadata.TagList>
              ) : (
                <Detail.Metadata.Label title="忌" text="-" />
              )}
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="星神" text={lunarHour.getTwelveStar().getName()} />
              <Detail.Metadata.Label title="吉凶" text={luck} />
              <Detail.Metadata.Label title="五行" text={sixtyCycle.getSound().getName()} />
              <Detail.Metadata.Label
                title="冲煞"
                text={`冲${earthBranch.getOpposite().getZodiac()} 煞${earthBranch.getOminous()}`}
              />
              <Detail.Metadata.Label
                title="方位"
                text={`喜神${handleDirection(heavenStem.getJoyDirection().toString())} 财神${handleDirection(heavenStem.getWealthDirection().toString())} 福神${handleDirection(heavenStem.getMascotDirection().toString())}`}
              />
            </Detail.Metadata>
          }
        />
      }
    />
  );
};
