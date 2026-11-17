"""Bundle every three-letter IATA entry from OurAirports' public-domain data."""

import csv
import io
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen

SOURCE = "https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/"
ROOT = Path(__file__).resolve().parents[1]


def download_csv(filename):
    with urlopen(SOURCE + filename, timeout=60) as response:
        return list(csv.DictReader(io.StringIO(response.read().decode("utf-8-sig"))))


def main():
    countries = {row["code"]: row["name"] for row in download_csv("countries.csv")}
    airports = []
    for row in download_csv("airports.csv"):
        if not re.fullmatch(r"[A-Z]{3}", row["iata_code"]):
            continue
        airports.append(
            {
                "id": row["ident"],
                "iata": row["iata_code"],
                "icao": row["icao_code"],
                "name": row["name"],
                "city": row["municipality"],
                "country": countries[row["iso_country"]],
                "countryCode": row["iso_country"],
                "type": row["type"],
                "keywords": row["keywords"],
            }
        )
    airports.sort(key=lambda airport: (airport["iata"], airport["id"]))
    if not airports:
        raise ValueError("Source contains no IATA airports; existing bundle was not changed")
    bundle = {
        "source": SOURCE,
        "updatedAt": datetime.now(timezone.utc).date().isoformat(),
        "airports": airports,
    }
    destination = ROOT / "assets" / "airports.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(bundle, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"Bundled {len(airports):,} airport records in {destination.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
