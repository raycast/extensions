import { useState } from "react";
import SharedForm from "./shared/shared-form";

const YearFacts = () => {
  const [number, setNumber] = useState("");
  const apiUrl = `http://numbersapi.com/${number || "random"}/year`;

  return <SharedForm apiUrl={apiUrl} inputType="year" number={number} setNumber={setNumber} allowNegative />;
};

export default YearFacts;
