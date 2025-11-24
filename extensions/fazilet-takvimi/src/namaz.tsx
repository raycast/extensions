import { Detail, LocalStorage, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState, useRef } from "react";

interface VakitData {
  tarih: string;
  is_takdiri: boolean;
}

interface Vakit {
  tarih: string;
  imsak: VakitData[];
  sabah: VakitData[];
  gunes: VakitData[];
  ogle: VakitData[];
  ikindi: VakitData[];
  aksam: VakitData[];
  yatsi: VakitData[];
}

interface City {
  id: number;
  adi: string;
}

interface District {
  id: number;
  adi: string;
}

interface ApiResponse {
  success: boolean;
  bolge_adi: string;
  vakitler: Vakit[];
  sehirler: City[];
  ilceler: District[];
}

interface PrayerTime {
  name: string;
  time: Date;
  displayTime: string;
}

export default function Command() {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [nextPrayer, setNextPrayer] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [location, setLocation] = useState<string>("");
  const [markdown, setMarkdown] = useState<string>("");
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [, setAllDistricts] = useState<District[]>([]);
  const [, setSelectedCityId] = useState<number>(31);
  const [, setSelectedDistrictId] = useState<number>(31);
  const [selectedCityName, setSelectedCityName] = useState<string>("İstanbul");
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>("");
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchPrayerTimes(undefined, true);
    }
  }, []);

  async function handleCityChange(cityId: number) {
    const selectedCity = cities.find((c) => c.id === cityId);
    if (selectedCity) {
      setSelectedCityId(cityId);
      setSelectedCityName(selectedCity.adi);
    }

    setLoading(true);
    try {
      const response = await fetch(`https://fazilettakvimi.com/api/cms/staging/daily?districtId=${cityId}`);
      const data = (await response.json()) as ApiResponse;

      if (data.ilceler && data.ilceler.length > 0) {
        setDistricts(data.ilceler);
        // İlçe seçimini sıfırla - kullanıcı manuel seçsin
        setSelectedDistrictId(cityId); // Şehir ID'sini kullan
        setSelectedDistrictName(""); // Boş bırak

        processPrayerData(data);

        await LocalStorage.setItem("selected_district_id", cityId.toString()); // Şehir ID'sini kaydet
        await LocalStorage.setItem("selected_city_id", cityId.toString());
        await LocalStorage.setItem("selected_city_name", selectedCity?.adi || "");
        await LocalStorage.setItem("selected_district_name", "");
        await LocalStorage.setItem("prayer_times_data", JSON.stringify(data));
        await LocalStorage.setItem("cached_district_id", cityId.toString());
      }
    } catch (error) {
      console.error("Error changing city:", error);
      setLoading(false);
    }
  }

  async function handleDistrictChange(districtId: number) {
    const selectedDistrict = districts.find((d) => d.id === districtId);
    if (selectedDistrict) {
      setSelectedDistrictId(districtId);
      setSelectedDistrictName(selectedDistrict.adi);
      await LocalStorage.setItem("selected_district_name", selectedDistrict.adi);
    }
    await fetchPrayerTimes(districtId);
  }

  useEffect(() => {
    const interval = setInterval(() => {
      updateCountdown();
    }, 1000);

    return () => clearInterval(interval);
  }, [prayerTimes]);

  function processPrayerData(data: ApiResponse, saveCitiesAndDistricts = false) {
    if (data.success && data.vakitler.length > 0) {
      const todayData = data.vakitler[1];

      const prayers: PrayerTime[] = [
        {
          name: "İmsak",
          time: new Date(todayData.imsak[0].tarih),
          displayTime: formatTime(new Date(todayData.imsak[0].tarih)),
        },
        {
          name: "Sabah",
          time: new Date(todayData.sabah[0].tarih),
          displayTime: formatTime(new Date(todayData.sabah[0].tarih)),
        },
        {
          name: "Güneş",
          time: new Date(todayData.gunes[0].tarih),
          displayTime: formatTime(new Date(todayData.gunes[0].tarih)),
        },
        {
          name: "Öğle",
          time: new Date(todayData.ogle[0].tarih),
          displayTime: formatTime(new Date(todayData.ogle[0].tarih)),
        },
        {
          name: "İkindi",
          time: new Date(todayData.ikindi[0].tarih),
          displayTime: formatTime(new Date(todayData.ikindi[0].tarih)),
        },
        {
          name: "Akşam",
          time: new Date(todayData.aksam[0].tarih),
          displayTime: formatTime(new Date(todayData.aksam[0].tarih)),
        },
        {
          name: "Yatsı",
          time: new Date(todayData.yatsi[0].tarih),
          displayTime: formatTime(new Date(todayData.yatsi[0].tarih)),
        },
      ];

      setPrayerTimes(prayers);
      setLocation(data.bolge_adi);
      setLoading(false);
      updateCountdown(prayers);

      // İlk yüklemede şehir ve ilçeleri cache'le
      if (saveCitiesAndDistricts && data.sehirler && data.ilceler) {
        setCities(data.sehirler);
        setAllDistricts(data.ilceler);
        setDistricts(data.ilceler);
        LocalStorage.setItem("cities_data", JSON.stringify(data.sehirler));
        LocalStorage.setItem("all_districts_data", JSON.stringify(data.ilceler));
      }
    }
  }

  async function fetchPrayerTimes(districtId?: number, isInitialLoad = false) {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Kaydedilmiş verileri yükle
      const savedDistrictId = await LocalStorage.getItem<string>("selected_district_id");
      const savedCityId = await LocalStorage.getItem<string>("selected_city_id");
      const savedCityName = await LocalStorage.getItem<string>("selected_city_name");
      const savedDistrictName = await LocalStorage.getItem<string>("selected_district_name");

      const currentDistrictId = districtId || (savedDistrictId ? parseInt(savedDistrictId) : 31);

      // Kaydedilmiş isimleri yükle
      if (savedCityId) setSelectedCityId(parseInt(savedCityId));
      if (savedCityName) setSelectedCityName(savedCityName);
      if (savedDistrictName) setSelectedDistrictName(savedDistrictName);

      // İlk yükleme: şehir ve ilçeleri cache'den yükle
      if (isInitialLoad) {
        const cachedCities = await LocalStorage.getItem<string>("cities_data");
        const cachedAllDistricts = await LocalStorage.getItem<string>("all_districts_data");

        if (cachedCities && cachedAllDistricts) {
          const citiesData = JSON.parse(cachedCities) as City[];
          const districtsData = JSON.parse(cachedAllDistricts) as District[];
          setCities(citiesData);
          setAllDistricts(districtsData);
          setDistricts(districtsData);
        }
      }

      // Önce cache'deki veriyi yükle (varsa)
      const cachedData = await LocalStorage.getItem<string>("prayer_times_data");
      const cachedDistrictId = await LocalStorage.getItem<string>("cached_district_id");

      if (cachedData && cachedDistrictId === currentDistrictId.toString()) {
        console.log("Cache'den veri gösteriliyor");
        const data = JSON.parse(cachedData) as ApiResponse;
        processPrayerData(data);
      } else {
        setLoading(true);
      }

      // Arka planda tarih kontrolü yap veya farklı districtId ise yeni veri çek
      const cachedDate = await LocalStorage.getItem<string>("prayer_times_date");
      const needsUpdate = cachedDate !== today || cachedDistrictId !== currentDistrictId.toString() || !cachedData;

      if (needsUpdate) {
        console.log("Yeni veri çekiliyor...");
        const response = await fetch(
          `https://fazilettakvimi.com/api/cms/staging/daily?districtId=${currentDistrictId}`,
        );
        const newData = (await response.json()) as ApiResponse;

        // Yeni veriyi kaydet
        await LocalStorage.setItem("prayer_times_date", today);
        await LocalStorage.setItem("prayer_times_data", JSON.stringify(newData));
        await LocalStorage.setItem("cached_district_id", currentDistrictId.toString());
        await LocalStorage.setItem("selected_district_id", currentDistrictId.toString());

        // Ekranı güncelle
        processPrayerData(newData, isInitialLoad);
        console.log("Yeni veri güncellendi");
      } else {
        console.log("Veri güncel, güncelleme yapılmadı");
      }
    } catch (error) {
      console.error("Error fetching prayer times:", error);
      setLoading(false);
    }
  }

  function formatTime(date: Date): string {
    const hours = date.getUTCHours() + 3;
    const minutes = date.getUTCMinutes();
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }

  function updateCountdown(prayers: PrayerTime[] = prayerTimes) {
    if (prayers.length === 0) return;

    const now = new Date();
    let nextPrayerIndex = -1;

    for (let i = 0; i < prayers.length; i++) {
      if (prayers[i].time > now) {
        nextPrayerIndex = i;
        break;
      }
    }

    if (nextPrayerIndex === -1) {
      setNextPrayer("İmsak");
      const tomorrow = new Date(prayers[0].time);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const diff = tomorrow.getTime() - now.getTime();
      setTimeLeft(formatCountdown(diff));
    } else {
      setNextPrayer(prayers[nextPrayerIndex].name);
      const diff = prayers[nextPrayerIndex].time.getTime() - now.getTime();
      setTimeLeft(formatCountdown(diff));
    }
  }

  function formatCountdown(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  useEffect(() => {
    updateMarkdown();
  }, [prayerTimes, nextPrayer, timeLeft, selectedCityName, selectedDistrictName]);

  function updateMarkdown() {
    if (prayerTimes.length === 0) {
      setMarkdown("Veriler yükleniyor...");
      return;
    }

    const prayerNames = prayerTimes.map((p) => p.name);
    const prayerTimesFormatted = prayerTimes.map((p) => p.displayTime);
    const nextIndex = prayerTimes.findIndex((p) => p.name === nextPrayer);

    const nameRow = prayerNames
      .map((name, index) => {
        if (index === nextIndex) {
          return `**${name.toUpperCase()}**`;
        }
        return name;
      })
      .join(" | ");

    const timeRow = prayerTimesFormatted
      .map((time, index) => {
        if (index === nextIndex) {
          return `**${time}**`;
        }
        return time;
      })
      .join(" | ");

    const md = `
<div align="center">

### ${nextPrayer} Vaktine Kalan Süre

# ${timeLeft}

</div>

---

| ${nameRow} |
|:-----:|:-----:|:-----:|:----:|:------:|:-----:|:-----:|
| ${timeRow} |

---

<div align="center">

**${location}**

*Şehir: ${selectedCityName}${selectedDistrictName ? ` | İlçe: ${selectedDistrictName}` : ""}*

</div>
`;

    setMarkdown(md);
  }

  return (
    <Detail
      isLoading={loading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Bölge Seçimi">
            <ActionPanel.Submenu title="ŞEhir Değiştir">
              {cities.map((city) => (
                <Action key={city.id} title={city.adi} onAction={() => handleCityChange(city.id)} />
              ))}
            </ActionPanel.Submenu>
            <ActionPanel.Submenu title={selectedDistrictName || "İlçe Seçin"}>
              {districts.map((district) => (
                <Action key={district.id} title={district.adi} onAction={() => handleDistrictChange(district.id)} />
              ))}
            </ActionPanel.Submenu>
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
