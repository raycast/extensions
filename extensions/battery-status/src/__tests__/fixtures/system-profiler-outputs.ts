/**
 * フィクスチャ: system_profiler SPPowerDataTypeの出力例
 */

export const normalBatteryOutput = `Power:

    Battery Information:

      Model Information:
          Serial Number: ABC12345678
          Manufacturer: Apple
          Device Name: battery-12345
          Pack Lot Code: 0
          PCB Lot Code: 0
          Firmware Version: 1234
          Hardware Revision: 1
          Cell Revision: 5678
      Charge Information:
          Charge Remaining (mAh): 4500
          Fully Charged: No
          Charging: Yes
          Full Charge Capacity (mAh): 5000
      Health Information:
          Cycle Count: 125
          Condition: Normal
          Battery Installed: Yes
          Amperage (mA): 1500
          Voltage (mV): 12000
      Battery Power Data:
          State of Charge (%): 85
          Maximum Capacity: 95%

    AC Charger Information:

      Connected: Yes
      ID: 0x1234
      Wattage (W): 60
      Revision: 0x0000
      Family: 0xFFFF
      Serial Number: ABCD1234
      Charging: Yes
`;

export const batteryDischarging = `Power:

    Battery Information:

      Charge Information:
          Fully Charged: No
          Charging: No
      Health Information:
          Cycle Count: 250
          Condition: Normal
      Battery Power Data:
          State of Charge (%): 45
          Maximum Capacity: 88%

    AC Charger Information:

      Connected: No
`;

export const batteryFullyCharged = `Power:

    Battery Information:

      Charge Information:
          Fully Charged: Yes
          Charging: No
      Health Information:
          Cycle Count: 50
          Condition: Normal
      Battery Power Data:
          State of Charge (%): 100
          Maximum Capacity: 98%

    AC Charger Information:

      Connected: Yes
      Wattage (W): 87
      Charging: No
`;

export const batteryReplaceSoon = `Power:

    Battery Information:

      Charge Information:
          Fully Charged: No
          Charging: Yes
      Health Information:
          Cycle Count: 850
          Condition: Replace Soon
      Battery Power Data:
          State of Charge (%): 65
          Maximum Capacity: 72%

    AC Charger Information:

      Connected: Yes
          Wattage (W): 60
      Charging: Yes
`;

export const batteryServiceRequired = `Power:

    Battery Information:

      Charge Information:
          Fully Charged: No
          Charging: No
      Health Information:
          Cycle Count: 1200
          Condition: Service Battery
      Battery Power Data:
          State of Charge (%): 30
          Maximum Capacity: 55%

    AC Charger Information:

      Connected: No
`;

export const missingMaxCapacity = `Power:

    Battery Information:

      Charge Information:
          Fully Charged: No
          Charging: Yes
      Health Information:
          Cycle Count: 100
          Condition: Normal
      Battery Power Data:
          State of Charge (%): 75

    AC Charger Information:

      Connected: Yes
      Wattage (W): 60
      Charging: Yes
`;

export const missingCycleCount = `Power:

    Battery Information:

      Charge Information:
          Fully Charged: No
          Charging: No
      Health Information:
          Condition: Normal
      Battery Power Data:
          State of Charge (%): 50
          Maximum Capacity: 90%

    AC Charger Information:

      Connected: No
`;

export const missingStateOfCharge = `Power:

    Battery Information:

      Charge Information:
          Fully Charged: No
          Charging: No
      Health Information:
          Cycle Count: 100
          Condition: Normal
      Battery Power Data:
          Maximum Capacity: 90%

    AC Charger Information:

      Connected: No
`;

export const emptyOutput = ``;

export const acConnectedNoWattage = `Power:

    Battery Information:

      Charge Information:
          Fully Charged: No
          Charging: Yes
      Health Information:
          Cycle Count: 150
          Condition: Normal
      Battery Power Data:
          State of Charge (%): 80
          Maximum Capacity: 92%

    AC Charger Information:

      Connected: Yes
      Charging: Yes
`;
