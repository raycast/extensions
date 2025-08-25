import { List } from "@raycast/api";
import { useEffect, useState } from "react";

type TidePoint = [string, number];
type TidePointsList = TidePoint[];

type NOAAPredictionsResponse = {
  predictions: Array<{
    t: string;
    v: string;
  }>;
};

function findHighLowTides(tides: TidePointsList) {
  if (tides.length === 0) return null;

  let high = tides[0];
  let low = tides[0];

  for (const tide of tides) {
    const [, value] = tide;
    if (value > high[1]) high = tide;
    if (value < low[1]) low = tide;
  }

  return { high, low };
}

function getStationId(search: string) {
  const stationMap: Record<string, string> = {
    "Dauphin Island, AL": "8735180",
    "Dog River Bridge, AL": "8735391",
    "East Fowl River Bridge, AL": "8735523",
    "Coast Guard Sector Mobile, AL": "8736897",
    "Mobile State Docks, AL": "8737048",
    "Chickasaw Creek, AL": "8737138",
    "West Fowl River Bridge, AL": "8738043",
    "Bayou La Batre Bridge, AL": "8739803",

    "Ketchikan, AK": "9450460",
    "Port Alexander, AK": "9451054",
    "Sitka, AK": "9451600",
    "Juneau, AK": "9452210",
    "Skagway, Taiya Inlet, AK": "9452400",
    "Elfin Cove, AK": "9452634",
    "Yakutat, Yakutat Bay, AK": "9453220",
    "Cordova, AK": "9454050",
    "Valdez, AK": "9454240",
    "Seward, AK": "9455090",
    "Seldovia, AK": "9455500",
    "Nikiski, AK": "9455760",
    "Anchorage, AK": "9455920",
    "Kodiak Island, AK": "9457292",
    "Alitak, AK": "9457804",
    "Sand Point, AK": "9459450",
    "King Cove, AK": "9459881",
    "Adak Island, AK": "9461380",
    "Atka, AK": "9461710",
    "Nikolski, AK": "9462450",
    "Unalaska, AK": "9462620",
    "Port Moller, AK": "9463502",
    "Village Cove, St Paul Island, AK": "9464212",
    "Unalakleet, AK": "9468333",
    "Nome, Norton Sound, AK": "9468756",
    "Red Dog Dock, AK": "9491094",
    "Prudhoe Bay, AK": "9497645",

    "Bermuda Biological Station, Bermuda": "2695535",
    "Bermuda, St. Georges Island, Bermuda": "2695540",

    "San Diego, CA": "9410170",
    "La Jolla, CA": "9410230",
    "Los Angeles, CA": "9410660",
    "Santa Monica, CA": "9410840",
    "Santa Barbara, CA": "9411340",
    "Port San Luis, CA": "9412110",
    "Monterey, CA": "9413450",
    "San Francisco, CA": "9414290",
    "Redwood City, CA": "9414523",
    "Alameda, CA": "9414750",
    "Richmond, CA": "9414863",
    "Point Reyes, CA": "9415020",
    "Martinez-Amorco Pier, CA": "9415102",
    "Port Chicago, CA": "9415144",
    "Port of West Sacramento, CA": "9416131",
    "Arena Cove, CA": "9416841",
    "North Spit, CA": "9418767",
    "Crescent City, CA": "9419750",

    "Christiansted Harbor, St Croix, VI": "9751364",
    "Lameshur Bay, St John, VI": "9751381",
    "Limetree Bay, VI": "9751401",
    "Charlotte Amalie, VI": "9751639",
    "Culebra, PR": "9752235",
    "Esperanza, Vieques Island, PR": "9752695",
    "San Juan, La Puntilla, San Juan Bay, PR": "9755371",
    "Magueyes Island, PR": "9759110",
    "Mayaguez, PR": "9759394",
    "Mona Island, PR": "9759938",

    "New London, CT": "8461490",
    "New Haven, CT": "8465705",
    "Bridgeport, CT": "8467150",

    "Delaware City, DE": "8551762",
    "Reedy Point, DE": "8551910",
    "Brandywine Shoal Light, DE": "8555889",
    "Lewes, DE": "8557380",

    "Washington, DC": "8594900",

    "Fernandina Beach, FL": "8720030",
    "Mayport (Bar Pilots Dock), FL": "8720218",
    "Dames Point, FL": "8720219",
    "Southbank Riverwalk, St Johns River, FL": "8720226",
    "I-295 Buckman Bridge, FL": "8720357",
    "Trident Pier, Port Canaveral, FL": "8721604",
    "Lake Worth Pier, Atlantic Ocean, FL": "8722670",
    "South Port Everglades, FL": "8722956",
    "Virginia Key, FL": "8723214",
    "Vaca Key, Florida Bay, FL": "8723970",
    "Key West, FL": "8724580",
    "NAPLES BAY, NORTH, FL": "8725114",
    "Fort Myers, FL": "8725520",
    "Port Manatee, FL": "8726384",
    "St. Petersburg, FL": "8726520",
    "Old Port Tampa, FL": "8726607",
    "East Bay, FL": "8726674",
    "Clearwater Beach, FL": "8726724",
    "Cedar Key, FL": "8727520",
    "Apalachicola, FL": "8728690",
    "Panama City, FL": "8729108",
    "Panama City Beach, FL": "8729210",
    "Pensacola, FL": "8729840",

    "Fort Pulaski, GA": "8670870",
    "Kings Bay MSF Pier, GA": "8679598",

    "Gibraltar, MI": "9044020",
    "Wyandotte, MI": "9044030",
    "Fort Wayne, MI": "9044036",
    "Windmill Point, MI": "9044049",

    "Buffalo, NY": "9063020",
    "Sturgeon Point, NY": "9063028",
    "Erie, Lake Erie, PA": "9063038",
    "Fairport, OH": "9063053",
    "Cleveland, OH": "9063063",
    "Marblehead, OH": "9063079",
    "Toledo, OH": "9063085",
    "Fermi Power Plant, MI": "9063090",

    "Lakeport, MI": "9075002",
    "Harbor Beach, MI": "9075014",
    "Essexville, MI": "9075035",
    "Alpena, MI": "9075065",
    "Mackinaw City, MI": "9075080",
    "De Tour Village, MI": "9075099",

    "Ludington, MI": "9087023",
    "Holland, MI": "9087031",
    "Calumet Harbor, IL": "9087044",
    "Milwaukee, WI": "9087057",
    "Kewaunee, Lake Michigan, WI": "9087068",
    "Sturgeon Bay Canal, WI": "9087072",
    "Green Bay East, WI": "9087077",
    "Menominee, MI": "9087088",
    "Port Inland, MI": "9087096",

    "Cape Vincent, NY": "9052000",
    "Oswego, NY": "9052030",
    "Rochester, NY": "9052058",
    "Olcott, NY": "9052076",

    "St Clair Shores, MI": "9034052",

    "Point Iroquois, MI": "9099004",
    "Marquette C.G., MI": "9099018",
    "Ontonagon, MI": "9099044",
    "Duluth, MN": "9099064",
    "Grand Marais, Lake Superior, MN": "9099090",

    "Ashland Ave, NY": "9063007",
    "American Falls, NY": "9063009",
    "Niagara Intake, NY": "9063012",

    "Algonac, MI": "9014070",
    "St. Clair State Police, MI": "9014080",
    "Dry Dock, MI": "9014087",
    "Mouth of the Black River, MI": "9014090",
    "Fort Gratiot, MI": "9014098",

    "Ogdensburg, NY": "8311030",
    "Alexandria Bay, NY": "8311062",

    "Rock Cut, MI": "9076024",
    "West Neebish Island, MI": "9076027",
    "Little Rapids, MI": "9076033",
    "U.S. Slip, MI": "9076060",
    "S.W. Pier, St. Marys River, MI": "9076070",

    "Nawiliwili, HI": "1611400",
    "Honolulu, HI": "1612340",
    "Pearl Harbor, HI": "1612401",
    "Mokuoloe, HI": "1612480",
    "Kahului, Kahului Harbor, HI": "1615680",
    "Kawaihae, HI": "1617433",
    "Hilo, Hilo Bay, Kuhio Bay, HI": "1617760",

    "Pilottown, LA": "8760721",
    "Pilots Station East, S.W. Pass, LA": "8760922",
    "Shell Beach, LA": "8761305",
    "Grand Isle, LA": "8761724",
    "New Canal Station, LA": "8761927",
    "Carrollton, LA": "8761955",
    "Port Fourchon, Belle Pass, LA": "8762075",
    "West Bank 1, Bayou Gauche, LA": "8762482",
    "Berwick, Atchafalaya River, LA": "8764044",
    "LAWMA, Amerada Pass, LA": "8764227",
    "Eugene Island, North of, Atchafalaya Bay, LA": "8764314",
    "Freshwater Canal Locks, LA": "8766072",
    "Lake Charles, LA": "8767816",
    "Bulk Terminal, LA": "8767961",
    "Calcasieu Pass, LA": "8768094",

    "Eastport, ME": "8410140",
    "Cutler Farris Wharf, ME": "8411060",
    "Bar Harbor, ME": "8413320",
    "Portland, ME": "8418150",
    "Seavey Island, ME": "8419870",

    "Ocean City Inlet, MD": "8570283",
    "Bishops Head, MD": "8571421",
    "Cambridge, MD": "8571892",
    "Tolchester Beach, MD": "8573364",
    "Chesapeake City, MD": "8573927",
    "Baltimore, MD": "8574680",
    "Annapolis, MD": "8575512",
    "Solomons Island, MD": "8577330",

    "Boston, MA": "8443970",
    "Fall River, MA": "8447386",
    "Chatham, MA": "8447435",
    "New Bedford Harbor, MA": "8447636",
    "Woods Hole, MA": "8447930",
    "Nantucket Island, MA": "8449130",

    "Pascagoula NOAA Lab, MS": "8741533",
    "Bay Waveland Yacht Club, MS": "8747437",

    "Sandy Hook, NJ": "8531680",
    "Atlantic City, NJ": "8534720",
    "Cape May, NJ": "8536110",
    "Ship John Shoal, NJ": "8537121",
    "Burlington, Delaware River, NJ": "8539094",

    "Montauk, NY": "8510560",
    "Kings Point, NY": "8516945",
    "The Battery, NY": "8518750",
    "Turkey Point Hudson River NERRS, NY": "8518962",
    "Coxsackie, Hudson River, NY": "8518979",

    "Duck, NC": "8651370",
    "Oregon Inlet Marina, NC": "8652587",
    "USCG Station Hatteras, NC": "8654467",
    "Beaufort, Duke Marine Lab, NC": "8656483",
    "Wilmington, NC": "8658120",
    "Wrightsville Beach, NC": "8658163",

    "Port Orford, OR": "9431647",
    "Charleston, OR": "9432780",
    "South Beach, OR": "9435380",
    "Garibaldi, OR": "9437540",
    "Astoria, OR": "9439040",
    "Wauna, OR": "9439099",
    "St Helens, OR": "9439201",

    "Sand Island, Midway Islands, United States of America": "1619910",
    "Apra Harbor, Guam, United States of America": "1630000",
    "Pago Bay, Guam, United States of America": "1631428",
    "Pago Pago, American Samoa, American Samoa": "1770000",
    "Kwajalein, Marshall Islands, United States of America": "1820000",
    "Wake Island, Pacific Ocean, United States of America": "1890000",

    "Marcus Hook, PA": "8540433",
    "Philadelphia, PA": "8545240",
    "Bridesburg, PA": "8546252",
    "Newbold, PA": "8548989",

    "Newport, RI": "8452660",
    "Conimicut Light, RI": "8452944",
    "Providence, RI": "8454000",
    "Quonset Point, RI": "8454049",

    "Springmaid Pier, SC": "8661070",
    "Charleston, SC": "8665530",

    "Port Arthur, TX": "8770475",
    "Rainbow Bridge, TX": "8770520",
    "Morgans Point, Barbours Cut, TX": "8770613",
    "Manchester, TX": "8770777",
    "High Island, TX": "8770808",
    "Texas Point, Sabine Pass, TX": "8770822",
    "Rollover Pass, TX": "8770971",
    "Eagle Point, Galveston Bay, TX": "8771013",
    "Galveston Bay Entrance, North Jetty, TX": "8771341",
    "Sabine Offshore Light, TX": "8771367",
    "Galveston Pier 21, TX": "8771450",
    "Galveston Railroad Bridge, TX": "8771486",
    "San Luis Pass, TX": "8771972",
    "Freeport Harbor, TX": "8772471",
    "Sargent, TX": "8772985",
    "Seadrift, TX": "8773037",
    "Matagorda City, TX": "8773146",
    "Port Lavaca, TX": "8773259",
    "Port O'Connor, TX": "8773701",
    "Matagorda Bay Entrance Channel, TX": "8773767",
    "Aransas Wildlife Refuge, TX": "8774230",
    "Rockport, TX": "8774770",
    "La Quinta Channel North, TX": "8775132",
    "Viola Turning Basin, TX": "8775222",
    "Port Aransas, TX": "8775237",
    "Aransas, Aransas Pass, TX": "8775241",
    "Enbridge, Ingleside, TX": "8775283",
    "USS Lexington, Corpus Christi Bay, TX": "8775296",
    "Packery Channel, TX": "8775792",
    "S. Bird Island, TX": "8776139",
    "Baffin Bay, TX": "8776604",
    "Rincon Del San Jose, TX": "8777812",
    "Port Mansfield, TX": "8778490",
    "Realitos Peninsula, TX": "8779280",
    "South Padre Island CG Station, TX": "8779748",
    "SPI Brazos Santiago, TX": "8779749",
    "Port Isabel, TX": "8779770",

    "Wachapreague, VA": "8631044",
    "Kiptopeke, VA": "8632200",
    "Dahlgren, VA": "8635027",
    "Lewisetta, VA": "8635750",
    "Windmill Point, VA": "8636580",
    "Yorktown USCG Training Center, VA": "8637689",
    "Sewells Point, VA": "8638610",
    "CBBT, Chesapeake Channel, VA": "8638901",
    "Money Point, VA": "8639348",

    "Vancouver, WA": "9440083",
    "TEMCO Kalama Terminal, WA": "9440357",
    "Longview, WA": "9440422",
    "Skamokawa, WA": "9440569",
    "Cape Disappointment, WA": "9440581",
    "Toke Point, WA": "9440910",
    "Westport, WA": "9441102",
    "La Push, Quillayute River, WA": "9442396",
    "Neah Bay, WA": "9443090",
    "Port Angeles, WA": "9444090",
    "Port Townsend, WA": "9444900",
    "Bremerton, WA": "9445958",
    "Tacoma, WA": "9446484",
    "Seattle, WA": "9447130",
    "Cherry Point, WA": "9449424",
    "Friday Harbor, WA": "9449880",
  }; // Example: "Dauphin Island, AL": "8735180",
  const key =
    Object.keys(stationMap).find(
      (k) => k.toLowerCase().split(",")[0] === search.toLowerCase() || k.toLowerCase() === search.toLowerCase(),
    ) || ""; // || means or

  return key ? stationMap[key] : null;
}

export default function Command() {
  const [search, setSearch] = useState("");
  const [tides, setTides] = useState<TidePointsList | null>(null);
  const [error, setError] = useState<string | null>(null);

  const id = getStationId(search);

  useEffect(() => {
    if (!search || !id) return; // don't fetch if no search or id

    fetch(
      `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=today&station=${id}&product=predictions&datum=STND&time_zone=lst_ldt&units=english&application=raycast_tides&format=json`,
    )
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((data: unknown) => {
        const noaaData = data as NOAAPredictionsResponse;
        const tidePointsList: TidePointsList = noaaData.predictions.map((point) => [point.t, parseFloat(point.v)]);
        setTides(tidePointsList);
        setError(null); // clear any old error
      })
      .catch((e) => {
        setError(e.message);
        setTides(null);
      });
  }, [search, id]);

  return (
    <List
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Enter NOAA station name"
      isLoading={!tides && !error && !!search}
    >
      {/* If there’s an error, show it as one item */}
      {error && <List.Item title="Error" subtitle={error} />}

      {search && !id && <List.Item title="Error" subtitle="No station found" />}

      {/* If no error and we have tide data, show results */}
      {tides &&
        !error &&
        (() => {
          const highLow = findHighLowTides(tides);
          if (!highLow) return <List.Item title="No tide data available" />;

          const high = highLow.high[0].split(" ")[1];
          const low = highLow.low[0].split(" ")[1];

          return (
            <>
              <List.Item title="High Tide" subtitle={high} />
              <List.Item title="Low Tide" subtitle={low} />
            </>
          );
        })()}
    </List>
  );
}
