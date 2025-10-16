export function getCarImageSrc(tModel: string, tMarketing_name: string, tColor: string) {
  const model = tModel.toString().toLowerCase();
  const marketing_name = tMarketing_name.toString().toLowerCase();
  const color = tColor.toString().toLowerCase();

  switch (model) {
    case "3":
      if (marketing_name.includes("p") || marketing_name.includes("performance")) {
        if (color.includes("white")) {
          return "../assets/car_images/3/White-P.png";
        } else if (color.includes("blue")) {
          return "../assets/car_images/3/Blue-P.png";
        } else if (color.includes("black")) {
          return "../assets/car_images/3/Black-P.png";
        } else if (color.includes("red")) {
          return "../assets/car_images/3/Red-P.png";
        } else if (color.includes("silver")) {
          return "../assets/car_images/3/Silver-P.png";
        } else {
          return "../assets/car_images/3/White-P.png";
        }
      } else {
        if (color.includes("white")) {
          return "../assets/car_images/3/White-Std.png";
        } else if (color.includes("blue")) {
          return "../assets/car_images/3/Blue-Std.png";
        } else if (color.includes("black")) {
          return "../assets/car_images/3/Black-Std.png";
        } else if (color.includes("red")) {
          return "../assets/car_images/3/Red-Std.png";
        } else if (color.includes("silver")) {
          return "../assets/car_images/3/Silver-Std.png";
        } else {
          return "../assets/car_images/3/White-Std.png";
        }
      }

    case "y":
      if (marketing_name.includes("p") || marketing_name.includes("performance")) {
        if (color.includes("white")) {
          return "../assets/car_images/Y/White-P.png";
        } else if (color.includes("blue")) {
          return "../assets/car_images/Y/Blue-P.png";
        } else if (color.includes("black")) {
          return "../assets/car_images/Y/Black-P.png";
        } else if (color.includes("red")) {
          return "../assets/car_images/Y/Red-P.png";
        } else if (color.includes("silver")) {
          return "../assets/car_images/Y/Silver-P.png";
        } else {
          return "../assets/car_images/Y/White-P.png";
        }
      } else {
        if (color.includes("white")) {
          return "../assets/car_images/Y/White-Std.png";
        } else if (color.includes("blue")) {
          return "../assets/car_images/Y/Blue-Std.png";
        } else if (color.includes("black")) {
          return "../assets/car_images/Y/Black-Std.png";
        } else if (color.includes("red")) {
          return "../assets/car_images/Y/Red-Std.png";
        } else if (color.includes("silver")) {
          return "../assets/car_images/Y/Silver-Std.png";
        } else {
          return "../assets/car_images/Y/White-Std.png";
        }
      }

    case "s":
      if (color.includes("white")) {
        return "../assets/car_images/S/White.png";
      } else if (color.includes("blue")) {
        return "../assets/car_images/S/Blue.png";
      } else if (color.includes("black")) {
        return "../assets/car_images/S/Black.png";
      } else if (color.includes("red")) {
        return "../assets/car_images/S/Red.png";
      } else if (color.includes("silver")) {
        return "../assets/car_images/S/Silver.png";
      } else if (color.includes("titanium")) {
        return "../assets/car_images/S/Titanium.png";
      } else {
        return "../assets/car_images/S/White.png";
      }

    case "x":
      if (color.includes("white")) {
        return "../assets/car_images/X/White.png";
      } else if (color.includes("blue")) {
        return "../assets/car_images/X/Blue.png";
      } else if (color.includes("black")) {
        return "../assets/car_images/X/Black.png";
      } else if (color.includes("red")) {
        return "../assets/car_images/X/Red.png";
      } else if (color.includes("silver")) {
        return "../assets/car_images/X/Silver.png";
      } else if (color.includes("titanium")) {
        return "../assets/car_images/X/Titanium.png";
      } else {
        return "../assets/car_images/X/White-P.png";
      }

    case "cybertruck":
      if (color.includes("black")) {
        return "../assets/car_images/Cybertruck/Black.png";
      } else {
        return "../assets/car_images/Cybertruck/Std.png";
      }

    default:
      return "../assets/car_images/3/Red-Std.png";
  }
}
