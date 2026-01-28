import { createContext } from "react";
import { Services } from "../Extension";

const ServicesContext = createContext<Services | null>(null);

export default ServicesContext;
