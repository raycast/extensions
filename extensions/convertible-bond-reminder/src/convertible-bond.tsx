import dayjs from 'dayjs';
import fetch from "node-fetch";

import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';

import { MenuBarExtra, Cache, environment, LaunchType } from "@raycast/api";

dayjs.extend(utc);
dayjs.extend(timezone);

const cache = new Cache();


function setBonds(bonds: object[]) {
  cache.set('bonds', JSON.stringify(bonds));
}

function getBonds() {
  const cached = cache.get('bonds');
  return cached ? JSON.parse(cached) : undefined;
}

async function updateBonds() {
  const currentDate = dayjs().tz('asia/shanghai').format('YYYY-MM-DD');
  try {
    const response = await fetch('https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=PUBLIC_START_DATE&sortTypes=-1&pageSize=10&pageNumber=1&reportName=RPT_BOND_CB_LIST&columns=ALL&source=WEB&client=WEB');
    const json = await response.json() as any;
    const result = json.result.data.filter(({ VALUE_DATE }: { VALUE_DATE: string }) => VALUE_DATE.includes(currentDate));
    if (!result.length) {
      setBonds([{
        SECURITY_NAME_ABBR: '今日无可转债信息更新',
      }]);
      return;
    }
    setBonds(result);
    cache.set('lastRefreshTime', dayjs().tz('asia/shanghai').format());
  } catch (error) {
    console.error(error);
    setBonds([{
      SECURITY_NAME_ABBR: '可转债信息更新失败',
    }]);
  }
}

function main() {
  const currentDate = dayjs().tz('asia/shanghai').format('YYYY-MM-DD');
  const bonds = getBonds();
  if (bonds[0]?.VALUE_DATE.includes(currentDate)) {
    return;
  }
  updateBonds();
}


export default function Command() {
  if (environment.launchType === LaunchType.Background) {
    cache.set('backgroundLaunchTime', dayjs().tz('asia/shanghai').format());
  }
  main();
  const bonds = getBonds();
  const currentDate = dayjs().tz('asia/shanghai').format('YYYY-MM-DD');
  return (
    <MenuBarExtra icon="../assets/menu_icon.png" tooltip={bonds ? `有${bonds.length}个可转债` : '无可转债'}>
      <MenuBarExtra.Item title={currentDate} />
      {
        bonds.map(({ SECURITY_NAME_ABBR }: { SECURITY_NAME_ABBR: string }) => (
          <MenuBarExtra.Item title={SECURITY_NAME_ABBR} key={SECURITY_NAME_ABBR} onAction={console.warn} />
        ))
      }
      <MenuBarExtra.Item title={`最近更新时间：${cache.get('lastRefreshTime')}`} />
      <MenuBarExtra.Item title="点击更新" onAction={updateBonds} />
      <MenuBarExtra.Item title={`上次后台刷新时间：${cache.get('backgroundLaunchTime')}`}/>
    </MenuBarExtra>
  );
}
