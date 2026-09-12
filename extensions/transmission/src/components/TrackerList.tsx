import { Detail } from "@raycast/api";
import { Fragment } from "react";
import { formatDate } from "../utils/date";
import { Torrent } from "../types";

export default function TrackerList({ torrent }: { torrent: Torrent }) {
  const reduced = torrent.trackers.reduce<Array<Torrent["trackerStats"]>>((acc, tracker) => {
    acc[tracker.tier] = (acc[tracker.tier] || []).concat(
      torrent.trackerStats.find(({ announce }) => announce === tracker.announce) as Torrent["trackerStats"][0],
    );
    return acc;
  }, []);

  return (
    <>
      {reduced.map((trackers) => {
        return trackers.map((tracker, key) => (
          <Fragment key={key}>
            <Detail.Metadata.Label title={tracker.host} text={`Tier ${trackers[0].tier + 1}`} />
            <Detail.Metadata.Label title="Last Announce" text={formatDate(tracker.lastAnnounceTime)} />
            <Detail.Metadata.Label title="Last Scape" text={formatDate(tracker.lastScrapeTime)} />
            <Detail.Metadata.Label title="Seeders" text={`${tracker.seederCount}`} />
            <Detail.Metadata.Label title="Leechers" text={`${tracker.leecherCount}`} />
            <Detail.Metadata.Label title="Downloaded" text={`${tracker.downloadCount}`} />
            <Detail.Metadata.Separator />
          </Fragment>
        ));
      })}
    </>
  );
}
