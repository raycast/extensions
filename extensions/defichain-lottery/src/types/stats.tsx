import moment from "moment";
import { formatNumber } from "../service/numbers";
import { Detail } from "@raycast/api";
import { WEBSITE, DEFISCAN_ADDRESS } from "../enum";
import { qrCodeFromAddress } from "../service/qrcode";

export type Stats = {
  stats: {
    burned_total: number;
    dusd_burned_total: number;
    donated_total: number;
    winnings_total: number;
    burn_shares: {
      burn_percentage: number;
      donation_percentage: number;
      marketing_percentage: number;
    };
    address: string;
    current_ticket_price: number;
    current_ticket_price_dusd: number;
    current_ticket_ratio_dusd: number;
    bucket_shares: [];
    drawing_running_in_days: number;
    main_net_running: boolean;
  };
  upcoming_drawing: {
    id: string;
    round_number: number;
    pot_size: number;
    ending_at: number;
    previous_id: string;
    tickets_count: {
      dusd: number;
      dfi: number;
    };
    bucket_preview: {
      match_1: {
        pot_size_preview: number;
        winning_chance_percentage: number;
        winning_chance_string: string;
      };
      match_2: {
        pot_size_preview: number;
        winning_chance_percentage: number;
        winning_chance_string: string;
      };
      match_3: {
        pot_size_preview: number;
        winning_chance_percentage: number;
        winning_chance_string: string;
      };
      match_4: {
        pot_size_preview: number;
        winning_chance_percentage: number;
        winning_chance_string: string;
      };
      match_5: {
        pot_size_preview: number;
        winning_chance_percentage: number;
        winning_chance_string: string;
      };
      match_6: {
        pot_size_preview: number;
        winning_chance_percentage: number;
        winning_chance_string: string;
      };
    };
  };
};

export async function statsToMarkdown(stats: Stats): Promise<string> {
  const soldTickets = stats.upcoming_drawing.tickets_count;
  const bucketPreview = stats.upcoming_drawing.bucket_preview;
  const text = `
  **Defichain Lottery** - next draw #${stats.upcoming_drawing.id}

  - current pot size: ***${formatNumber(stats.upcoming_drawing.pot_size, "DFI")}***

  - round ending ${moment
    .duration(moment(stats.upcoming_drawing.ending_at).diff(moment()))
    .humanize(true, { d: 7, w: 4 })} (${moment(stats.upcoming_drawing.ending_at).format("DD.MM.YY HH:mm")} UTC)

  - ${soldTickets.dusd + soldTickets.dfi} tickets sold (${soldTickets.dfi}x DFI, ${soldTickets.dusd}x dUSD)

  - preview of buckets:
    - Bucket 1: ***${formatNumber(bucketPreview.match_1.pot_size_preview, "DFI")}*** (chance ${
    bucketPreview.match_1.winning_chance_string
  } = ${bucketPreview.match_1.winning_chance_percentage} %)
    - Bucket 2: ***${formatNumber(bucketPreview.match_2.pot_size_preview, "DFI")}*** (chance ${
    bucketPreview.match_2.winning_chance_string
  } = ${bucketPreview.match_2.winning_chance_percentage} %)
    - Bucket 3: ***${formatNumber(bucketPreview.match_3.pot_size_preview, "DFI")}*** (chance ${
    bucketPreview.match_3.winning_chance_string
  } = ${bucketPreview.match_3.winning_chance_percentage} %)
    - Bucket 4: ***${formatNumber(bucketPreview.match_4.pot_size_preview, "DFI")}*** (chance ${
    bucketPreview.match_4.winning_chance_string
  } = ${bucketPreview.match_4.winning_chance_percentage} %)
    - Bucket 5: ***${formatNumber(bucketPreview.match_5.pot_size_preview, "DFI")}*** (chance ${
    bucketPreview.match_5.winning_chance_string
  } = ${bucketPreview.match_5.winning_chance_percentage} %)
    - Bucket 6: ***${formatNumber(bucketPreview.match_6.pot_size_preview, "DFI")}*** (chance ${
    bucketPreview.match_6.winning_chance_string
  } = ${bucketPreview.match_6.winning_chance_percentage} %)

    
    ## buy your tickets now:

  `;

  return qrCodeFromAddress(stats.stats.address).then(function (qrCode) {
    return new Promise((resolve) => {
      resolve(text + `![Defichain Lottery deposit address](${qrCode})`);
    });
  });
}

export function statsToDetails(statistics: Stats): any {
  return (
    <>
      <Detail.Metadata>
        <Detail.Metadata.Label title="DFI burned total" text={formatNumber(statistics.stats.burned_total, "DFI")} />
        <Detail.Metadata.Label
          title="dUSD burned total"
          text={formatNumber(statistics.stats.dusd_burned_total, "dUSD")}
        />
        <Detail.Metadata.Label title="DFI donated" text={formatNumber(statistics.stats.donated_total, "DFI")} />
        <Detail.Metadata.Separator />
        <Detail.Metadata.Link title="Website" target={WEBSITE} text={WEBSITE} />
        <Detail.Metadata.Link
          title="Lottery deposit address"
          target={DEFISCAN_ADDRESS + statistics.stats.address}
          text={statistics.stats.address}
        />
      </Detail.Metadata>
    </>
  );
}
