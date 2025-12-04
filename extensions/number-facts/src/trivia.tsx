import { useState } from "react";
import SharedForm from "./shared/shared-form";

const TriviaFacts = () => {
  const [number, setNumber] = useState("");
  const apiUrl = `http://numbersapi.com/${number || "random"}/trivia?notfound=floor`;

  return <SharedForm apiUrl={apiUrl} inputType="number" number={number} setNumber={setNumber} allowNegative={false} />;
};

export default TriviaFacts;
