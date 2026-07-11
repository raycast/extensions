import { List } from "@raycast/api";
import React, { useEffect, useState } from "react";
import axios from "axios";

interface Props {
  tripId: number;
  title: string;
}

interface DetailsResponse {
  stop_time: [
    {
      id: string;
      arrival_time: string;
      stop_name: string;
    }
  ];
}

const Stops: React.FC<Props> = ({ tripId, title }) => {
  const [stops, setStops] = useState<DetailsResponse | null>(null);

  useEffect(() => {
    const fetchStops = async () => {
      const response = await axios.get(`https://api.ridango.com/v2/64/intercity/trip/${tripId}/details`);
      setStops(response.data as DetailsResponse);
    };
    fetchStops();
  }, []);

  return (
    <>
      <List isLoading={!stops} navigationTitle={title}>
        {stops?.stop_time.map((stop) => {
          return <List.Item key={stop.id} title={stop.arrival_time.slice(0, 5)} subtitle={stop.stop_name} />;
        })}
      </List>
    </>
  );
};

export default Stops;
