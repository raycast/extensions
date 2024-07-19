import { Form } from "@raycast/api";
import { useState } from "react";
import { SportType, ActivityType } from "../api/types";


export default function Activity() {

  const [activitySportType, setSelectedActivityType] = useState<ActivityType | ''>('');
  const activityTypes = Object.values(ActivityType); 

  const [selectedSportType, setSelectedSportType] = useState<SportType | ''>('');
  const sportTypes = Object.values(SportType); 

  function splitCamelCase(input: string): string {
    // Handle the special case where a word starts with 'E' followed by another uppercase letter
    input = input.replace(/(^E)([A-Z])/g, 'E-$2');
    // Split the camel case words
    return input.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  }


    return ( 
        <section>       
            <Form.Dropdown
            id="dropdown"
            title="Activity Type"
            value={selectedSportType}
            onChange={value => setSelectedSportType(value as SportType)} >
            <Form.Dropdown.Item value="" title="Please select an option" />
            {sportTypes.map(sportType => (
                <Form.Dropdown.Item key={sportType} value={sportType} title={splitCamelCase(sportType)} />
            ))};
        </Form.Dropdown>

        <Form.Dropdown
            id="dropdown"
            title="Sports Type"
            value={selectedSportType}
            onChange={value => setSelectedSportType(value as SportType)} >
            <Form.Dropdown.Item value="" title="Please select an option" />
            {sportTypes.map(sportType => (
                <Form.Dropdown.Item key={sportType} value={sportType} title={splitCamelCase(sportType)} />
            ))};
        </Form.Dropdown>
      </section>

    )
    
}
