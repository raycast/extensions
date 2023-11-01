import { ActionPanel, Detail, List, Action, Icon, Color, getPreferenceValues} from "@raycast/api";
import { useState, useEffect } from "react";
import got from "got";

var index_day = 0
function getDateInfo(date_str: string) {
  // 返回星期信息
  // const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  // const date = new Date(date_str);
  // const dayOfWeek = weekdays[date.getDay()];
  // return `${date_str} ${dayOfWeek}`;

  let rst = ""
  switch(index_day % 3){
      case 0:
        rst = "今天"
        break;
      case 1:
        rst = "明天"
        break;
      case 2:
        rst = "后天"
        break;
  }
  index_day = index_day + 1
  return rst
}

// Extension Preferences
interface Preferences {
  token?: string; // 和风天气的token
  cityName? : string; // 默认查询城市
}
var preferences = getPreferenceValues<Preferences>();



export default function Command() {
  const [searchText, setSearchText] = useState(preferences['cityName']);
  const [dailyWeather, setDailyWeather] = useState([]);
  const [weatherNow, setWeatherNow] = useState({ 'text': "", 'temp': "" });
  const [cityInfo, setCityInfo] = useState({'cityFullName':'', 'cityID':''})
  const [hourlyData, setHourlyData] = useState([]);

  useEffect(() => {
    async function getWeather() {
      if (searchText!!.length < 2) {
        return;
      }

      // 先获取城市名称和 cityid
      const city_info: any = await got(
        `https://geoapi.qweather.com/v2/city/lookup?location=${searchText}&key=${preferences['token']}&range=cn&number=1`
      ).json();
      if (city_info["code"] != 200) {
        console.error(`==> error code ${city_info["code"]}`);
        return;
      }
      setCityInfo({'cityFullName':city_info["location"][0]["name"], 'cityID':city_info["location"][0]["id"]})

      // 查询实时天气
      const weather_now: any = await got(
        `https://api.qweather.com/v7/weather/now?location=${city_info["location"][0]["id"]}&key=${preferences['token']}`
      ).json();
      setWeatherNow(weather_now["now"]);

      // 查询7天的天气
      const daily_weather: any = await got(
        `https://api.qweather.com/v7/weather/3d?location=${city_info["location"][0]["id"]}&key=${preferences['token']}`
      ).json();
      setDailyWeather(daily_weather["daily"]);

      // 24小时的天气详情
      const hourly_weather: any= await got(`https://api.qweather.com/v7/weather/24h?location=${city_info["location"][0]["id"]}&key=${preferences['token']}`).json()
      setHourlyData(hourly_weather['hourly'])
    }
    getWeather();
  }, [searchText]);

  return (
    <List 
        filtering={false} 
        searchBarPlaceholder ="输入城市名称"
        throttle={true} 
        isLoading={dailyWeather.length == 0 || weatherNow['text'].length==0 || weatherNow['temp'].length==0} 
        onSearchTextChange={setSearchText}>
      <List.Section title="当前的天气情况">
        <List.Item
          key={"weather_now"}
          icon={{
            source: weatherNow["text"] == "" ? Icon.Dot : "icons/" + weatherNow??["icon"] + ".svg",
            tintColor: Color.PrimaryText,
          }}
          title={
            weatherNow["text"] == "" ? "正在获取天气数据..." : `当前${weatherNow["text"]}，温度${weatherNow["temp"]}°C`
          }
          subtitle={`(${cityInfo['cityFullName']})`}
          accessories={[{ text: "当前天气" }]}
          actions = {
            // 24小时的天气详情
            <ActionPanel>
                <Action.Push 
                  title="未来24小时天气" 
                  target={ HourlyWeather(cityInfo['cityFullName'],cityInfo['cityID'], hourlyData, hourlyData.length == 0) } 
                />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="未来3天的天气">
        {dailyWeather.map((item) => (
          <List.Item
            key={item["fxDate"]}
            icon={{
              source: {
                light: "icons/" + item["iconDay"] + ".svg",
                dark: "icons/" + item["iconNight"] + ".svg",
              },
              tintColor: Color.PrimaryText,
            }}
            title={`白天${item["textDay"]}，夜晚${item["textNight"]}  ${item["tempMin"]}°C - ${item["tempMax"]}°C`}
            subtitle={`(${cityInfo['cityFullName']})`}
            accessories={[{ text: getDateInfo(item["fxDate"]) }]}
          />
        ))}
      </List.Section>
    </List>
  );
}

function getDate(str:string){
  return str.substr(11,5)
}

function HourlyWeather(cityName:string, cityID:string, hourlyData:any[], isLoading:Boolean){
  if (cityName.length == 0 || cityID.length == 0 || isLoading) return ;

  return (
    <List 
      filtering={false} 
      throttle={true} 
      isLoading={hourlyData.length == 0} 
      >
      <List.Section title="未来24小时的天气情况">
        {hourlyData.map((item) => (
          <List.Item
            key={item["fxTime"]}
            icon={{ source: "icons/" + `${item["icon"]}` + ".svg" }}
            title={`${item['text']}, ${item['temp']}°C`}
            subtitle={ getDate(item['fxTime'])}
            // accessories={[{ text: getDateInfo(item["fxDate"]) }]}
          />
        ))}
      </List.Section>
    </List>
  )
}