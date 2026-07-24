import { Icon, List } from "@raycast/api";

import { getEntityName } from "../api/musicbrainz";
import {
  EntityType,
  MBArtist,
  MBLabel,
  MBRecording,
  MBRelease,
  MBReleaseGroupFull,
  MBWork,
  SearchResult,
} from "../types";
import {
  formatArtistCredit,
  formatDuration,
  formatMediaFormats,
  formatTrackCount,
  getEntityIcon,
  getScoreColor,
} from "../utils";

import { ArtistDetail } from "./detail/ArtistDetail";
import { LabelDetail } from "./detail/LabelDetail";
import { RecordingDetail } from "./detail/RecordingDetail";
import { ReleaseDetail } from "./detail/ReleaseDetail";
import { ReleaseGroupDetail } from "./detail/ReleaseGroupDetail";
import { WorkDetail } from "./detail/WorkDetail";
import { EntityActions } from "./EntityActions";

interface SearchResultItemProps {
  entityType: EntityType;
  result: SearchResult;
  onViewDetails?: () => void;
  onPop?: () => void;
}

export function SearchResultItem({ entityType, result, onViewDetails, onPop }: SearchResultItemProps) {
  const name = getEntityName(entityType, result);
  const detailTarget = getDetailTarget(entityType, result);

  return (
    <List.Item
      title={name}
      subtitle={getSubtitle(entityType, result)}
      icon={getEntityIcon(entityType)}
      accessories={getAccessories(entityType, result)}
      actions={
        <EntityActions
          entityType={entityType}
          mbid={result.id}
          name={name}
          detailTarget={detailTarget}
          onViewDetails={onViewDetails}
          onPop={onPop}
        />
      }
    />
  );
}

function getSubtitle(type: EntityType, entity: SearchResult): string {
  switch (type) {
    case "artist": {
      const artist = entity as MBArtist;

      return artist.disambiguation ?? "";
    }
    case "release": {
      const release = entity as MBRelease;

      return formatArtistCredit(release["artist-credit"]);
    }
    case "recording": {
      const recording = entity as MBRecording;

      return formatArtistCredit(recording["artist-credit"]);
    }
    case "release-group": {
      const rg = entity as MBReleaseGroupFull;

      return formatArtistCredit(rg["artist-credit"]);
    }
    case "label": {
      const label = entity as MBLabel;

      return label.disambiguation ?? "";
    }
    case "work": {
      const work = entity as MBWork;

      return work.disambiguation ?? "";
    }
  }
}

function getAccessories(type: EntityType, entity: SearchResult): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  switch (type) {
    case "artist": {
      const artist = entity as MBArtist;

      if (artist.type) {
        accessories.push({ tag: artist.type });
      }

      if (artist.country) {
        accessories.push({ tag: artist.country, icon: Icon.Globe });
      }

      break;
    }
    case "release": {
      const release = entity as MBRelease;

      if (release.date) {
        accessories.push({ tag: release.date, icon: Icon.Calendar });
      }

      if (release.country) {
        accessories.push({ tag: release.country, icon: Icon.Globe });
      }

      const format = formatMediaFormats(release.media);

      if (format) {
        accessories.push({ tag: format });
      }

      const tracks = formatTrackCount(release.media);

      if (tracks) {
        accessories.push({ tag: tracks });
      }

      break;
    }
    case "recording": {
      const recording = entity as MBRecording;
      const duration = formatDuration(recording.length);

      if (duration) {
        accessories.push({ tag: duration, icon: Icon.Clock });
      }

      if (recording["first-release-date"]) {
        accessories.push({ tag: recording["first-release-date"], icon: Icon.Calendar });
      }

      break;
    }
    case "release-group": {
      const rg = entity as MBReleaseGroupFull;

      if (rg["primary-type"]) {
        accessories.push({ tag: rg["primary-type"] });
      }

      if (rg["first-release-date"]) {
        accessories.push({ tag: rg["first-release-date"], icon: Icon.Calendar });
      }

      break;
    }
    case "label": {
      const label = entity as MBLabel;

      if (label.type) {
        accessories.push({ tag: label.type });
      }

      if (label.country) {
        accessories.push({ tag: label.country, icon: Icon.Globe });
      }

      break;
    }
    case "work": {
      const work = entity as MBWork;

      if (work.type) {
        accessories.push({ tag: work.type });
      }

      if (work.language) {
        accessories.push({ tag: work.language, icon: Icon.Globe });
      }

      break;
    }
  }

  accessories.push({
    tag: { value: `${entity.score}%`, color: getScoreColor(entity.score) },
    icon: Icon.Star,
    tooltip: "Relevance score",
  });

  return accessories;
}

export function getDetailTarget(type: EntityType, entity: SearchResult): React.ReactNode {
  switch (type) {
    case "artist":
      return <ArtistDetail artist={entity as MBArtist} />;
    case "release":
      return <ReleaseDetail release={entity as MBRelease} />;
    case "recording":
      return <RecordingDetail recording={entity as MBRecording} />;
    case "release-group":
      return <ReleaseGroupDetail releaseGroup={entity as MBReleaseGroupFull} />;
    case "label":
      return <LabelDetail label={entity as MBLabel} />;
    case "work":
      return <WorkDetail work={entity as MBWork} />;
  }
}
