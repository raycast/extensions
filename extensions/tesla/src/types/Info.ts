export interface Info {
  code: number;
  response: {
    name: string;
    public_id: string;
    odometer: number;
    model: string;
    trim: string;
    year: string;
    car_version: string;
    battery: {
      level: number;
      range: string;
      charge_limit_soc: number;
      charging_state: string;
      minutes_remaining: number;
      time_remaining: string;
      scheduled_charging_pending: boolean;
      scheduled_charging_start_time: string;
    };
    render_url: string;
    climate: {
      inside: number;
      outside: number;
      is_auto_conditioning_on: boolean;
      is_climate_on: boolean;
      is_front_defroster_on: boolean;
      is_rear_defroster_on: boolean;
      seat_heaters: {
        left: number;
        right: number;
        left_rear: number;
        right_rear: number;
        center_rear: number;
      };
    };
    software: { status: string; version: string; download_percentage: number; install_percentage: number };
    statistics: {
      drives: number;
      distance: number;
      drives_duration: number;
      charges: number;
      supercharging: number;
      charges_duration: number;
      charges_kwh: number;
      joined: string;
      hw: string;
    };
    vehicle: {
      locked: boolean;
      sentry_mode: boolean;
      latitude: number;
      longitude: number;
      is_user_present: boolean;
      windows: {
        driver_front: boolean;
        driver_rear: boolean;
        passenger_front: boolean;
        passenger_rear: boolean;
      };
      config: {
        color: string;
        color_name: string;
        wheels: string;
        spoiler: string;
        roof_color: string;
      };
    };
  };
}
