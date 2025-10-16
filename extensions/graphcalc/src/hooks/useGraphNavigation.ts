import { useState } from "react";
import { showToast, Toast } from "@raycast/api";
import {
  MAX_ZOOM_LEVEL,
  MIN_ZOOM_LEVEL,
  MAX_PAN_LEVEL,
  INITIAL_X_MIN,
  INITIAL_X_MAX,
  INITIAL_Y_MIN,
  INITIAL_Y_MAX,
} from "../constants";

export function useGraphNavigation(
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  setXMin: (value: number) => void,
  setXMax: (value: number) => void,
  setYMin: (value: number) => void,
  setYMax: (value: number) => void,
) {
  const [zoomLevel, setZoomLevel] = useState<number>(0);
  const [panXLevel, setPanXLevel] = useState<number>(0);
  const [panYLevel, setPanYLevel] = useState<number>(0);

  const zoomFactor = 0.8;
  const panFactor = 0.3;

  const zoomIn = () => {
    if (zoomLevel >= MAX_ZOOM_LEVEL) {
      showToast({
        style: Toast.Style.Failure,
        title: "Maximum Zoom In Level Reached",
        message: "You cannot zoom in any further.",
      });
      return;
    }

    const xRange = xMax - xMin;
    const yRange = yMax - yMin;
    const newXMin = xMin + (xRange * (1 - zoomFactor)) / 2;
    const newXMax = xMax - (xRange * (1 - zoomFactor)) / 2;
    const newYMin = yMin + (yRange * (1 - zoomFactor)) / 2;
    const newYMax = yMax - (yRange * (1 - zoomFactor)) / 2;
    setXMin(newXMin);
    setXMax(newXMax);
    setYMin(newYMin);
    setYMax(newYMax);
    setZoomLevel(zoomLevel + 1);
  };

  const zoomOut = () => {
    if (zoomLevel <= MIN_ZOOM_LEVEL) {
      showToast({
        style: Toast.Style.Failure,
        title: "Maximum Zoom Out Level Reached",
        message: "You cannot zoom out any further.",
      });
      return;
    }

    const zoomOutFactor = 1 / zoomFactor;
    const xRange = xMax - xMin;
    const yRange = yMax - yMin;
    const newXMin = xMin - (xRange * (zoomOutFactor - 1)) / 2;
    const newXMax = xMax + (xRange * (zoomOutFactor - 1)) / 2;
    const newYMin = yMin - (yRange * (zoomOutFactor - 1)) / 2;
    const newYMax = yMax + (yRange * (zoomOutFactor - 1)) / 2;
    setXMin(newXMin);
    setXMax(newXMax);
    setYMin(newYMin);
    setYMax(newYMax);
    setZoomLevel(zoomLevel - 1);
  };

  const moveLeft = () => {
    if (panXLevel <= -MAX_PAN_LEVEL) {
      showToast({
        style: Toast.Style.Failure,
        title: "Maximum Left Pan Reached",
        message: "You cannot pan left any further.",
      });
      return;
    }

    const xRange = xMax - xMin;
    const deltaX = xRange * panFactor;
    setXMin(xMin - deltaX);
    setXMax(xMax - deltaX);
    setPanXLevel(panXLevel - 1);
  };

  const moveRight = () => {
    if (panXLevel >= MAX_PAN_LEVEL) {
      showToast({
        style: Toast.Style.Failure,
        title: "Maximum Right Pan Reached",
        message: "You cannot pan right any further.",
      });
      return;
    }

    const xRange = xMax - xMin;
    const deltaX = xRange * panFactor;
    setXMin(xMin + deltaX);
    setXMax(xMax + deltaX);
    setPanXLevel(panXLevel + 1);
  };

  const moveUp = () => {
    if (panYLevel >= MAX_PAN_LEVEL) {
      showToast({
        style: Toast.Style.Failure,
        title: "Maximum Upward Pan Reached",
        message: "You cannot pan up any further.",
      });
      return;
    }

    const yRange = yMax - yMin;
    const deltaY = yRange * panFactor;
    setYMin(yMin + deltaY);
    setYMax(yMax + deltaY);
    setPanYLevel(panYLevel + 1);
  };

  const moveDown = () => {
    if (panYLevel <= -MAX_PAN_LEVEL) {
      showToast({
        style: Toast.Style.Failure,
        title: "Maximum Downward Pan Reached",
        message: "You cannot pan down any further.",
      });
      return;
    }

    const yRange = yMax - yMin;
    const deltaY = yRange * panFactor;
    setYMin(yMin - deltaY);
    setYMax(yMax - deltaY);
    setPanYLevel(panYLevel - 1);
  };

  const resetView = () => {
    setXMin(INITIAL_X_MIN);
    setXMax(INITIAL_X_MAX);
    setYMin(INITIAL_Y_MIN);
    setYMax(INITIAL_Y_MAX);
    setZoomLevel(0);
    setPanXLevel(0);
    setPanYLevel(0);
    showToast({
      style: Toast.Style.Success,
      title: "View Reset",
      message: "Graph view has been reset to the default settings.",
    });
  };

  return {
    zoomIn,
    zoomOut,
    moveLeft,
    moveRight,
    moveUp,
    moveDown,
    resetView,
  };
}
