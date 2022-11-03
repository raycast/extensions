import StatsListItem from "./StatsListItem";

const TimeRemainingItem = (props: { timeRemaining: number }) => {
  const hoursRemaining = Math.floor(props.timeRemaining / 60);
  const minutesRemaining = (props.timeRemaining % 60).toLocaleString("en-US", {
    minimumIntegerDigits: 2,
  });

  const formatted =
    props.timeRemaining !== undefined && props.timeRemaining < 1500 && props.timeRemaining !== 0
      ? `${hoursRemaining}:${minutesRemaining}`
      : "--";

  return <StatsListItem label="Time Remaining" value={formatted} />;
};

export default TimeRemainingItem;
