<div align="center">
  <img src="media/ekstraklasa-logo.png" height="128">
  <h1>Ekstraklasa</h1>
</div>

Stay up to date with the latest Ekstraklasa standings.

![Demo](./media/demo-screenshot.png)

## Setup

Since there is no free API that could be used to gather the ekstraklasa standings, in order to run the extension you need to set up a scrapper, that gathers the required data locally - instructions can be found in [this repo](https://github.com/szarbartosz/ekstraklasa-scraper).

If you are using docker it is as simple as running:

```bash
git clone https://github.com/szarbartosz/ekstraklasa-scraper.git
cd ekstraklasa-scraper
./pull_and_compose.sh
```
