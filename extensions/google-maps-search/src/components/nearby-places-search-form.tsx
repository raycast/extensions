import { useState } from "react";
import { Action, ActionPanel, Form, Icon, openExtensionPreferences, useNavigation } from "@raycast/api";
import { OriginOption, PLACE_TYPES } from "../utils/types";
import { useNearbyPlaces } from "../hooks/use-nearby-places";
import { PlaceSearchResults } from "./place-search-results";
import { PlaceDetailView } from "./place-detail-view";
import { getUnitSystem, getDefaultRadius } from "../utils/common";

export function NearbyPlacesSearchForm() {
  const { push } = useNavigation();
  const { searchNearbyPlaces, isLoading } = useNearbyPlaces();

  const [placeType, setPlaceType] = useState<string>("restaurant");
  const [origin, setOrigin] = useState<OriginOption>(OriginOption.Home);

  // Handle origin change with proper type conversion
  const handleOriginChange = (newValue: string) => {
    setOrigin(newValue as OriginOption);
  };

  // Get user's preferred unit system and default radius
  const unitSystem = getUnitSystem();
  const [radius, setRadius] = useState<string>(getDefaultRadius());

  const [customAddress, setCustomAddress] = useState<string>("");

  // Handle search submission
  const handleSubmit = async () => {
    const places = await searchNearbyPlaces(placeType, origin, customAddress, parseInt(radius, 10));

    if (places && places.length > 0) {
      push(
        <PlaceSearchResults
          places={places}
          isLoading={false}
          onSelectPlace={(placeId) =>
            push(
              <PlaceDetailView
                placeId={placeId}
                onBack={() =>
                  push(
                    <PlaceSearchResults
                      places={places}
                      isLoading={false}
                      onSelectPlace={(id) =>
                        push(
                          <PlaceDetailView
                            placeId={id}
                            onBack={() =>
                              push(
                                <PlaceSearchResults
                                  places={places}
                                  isLoading={false}
                                  onSelectPlace={(id) =>
                                    push(
                                      <PlaceDetailView
                                        placeId={id}
                                        onBack={() =>
                                          push(
                                            <PlaceSearchResults
                                              places={places}
                                              isLoading={false}
                                              onSelectPlace={(pid) =>
                                                push(
                                                  <PlaceDetailView
                                                    placeId={pid}
                                                    onBack={() => push(<NearbyPlacesSearchForm />)}
                                                  />
                                                )
                                              }
                                              onBack={() => push(<NearbyPlacesSearchForm />)}
                                            />
                                          )
                                        }
                                      />
                                    )
                                  }
                                  onBack={() => push(<NearbyPlacesSearchForm />)}
                                />
                              )
                            }
                          />
                        )
                      }
                      onBack={() => push(<NearbyPlacesSearchForm />)}
                    />
                  )
                }
              />
            )
          }
          onBack={() => push(<NearbyPlacesSearchForm />)}
        />
      );
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search" icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} />
          <Action title="Open Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="placeType" title="Type of Places" value={placeType} onChange={setPlaceType}>
        {PLACE_TYPES.map((type) => (
          <Form.Dropdown.Item key={type.value} value={type.value} title={type.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="origin" title="Search Near" value={origin} onChange={handleOriginChange}>
        <Form.Dropdown.Item value={OriginOption.Home} title="Home Address" icon={Icon.House} />
        <Form.Dropdown.Item value={OriginOption.Custom} title="Custom Address" icon={Icon.Pencil} />
      </Form.Dropdown>

      {origin === OriginOption.Custom && (
        <Form.TextField
          id="customAddress"
          title="Custom Address"
          placeholder="Enter address"
          value={customAddress}
          onChange={setCustomAddress}
        />
      )}

      <Form.TextField
        id="radius"
        title={`Search Radius (${unitSystem === "imperial" ? "miles" : "km"})`}
        placeholder={getDefaultRadius()}
        value={radius}
        onChange={setRadius}
      />
    </Form>
  );
}
