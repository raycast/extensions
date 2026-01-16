```fortran
double precision function dsdot (
        integer n,
        real, dimension(*) sx,
        integer incx,
        real, dimension(*) sy,
        integer incy
)
```

Compute the inner product of two vectors with extended
precision accumulation and result.

Returns D.P. dot product accumulated in D.P., for S.P. SX and SY
DSDOT = sum for I = 0 to N-1 of  SX(LX+I\*INCX) \* SY(LY+I\*INCY),
where LX = 1 if INCX .GE. 0, else LX = 1+(1-N)\*INCX, and LY is
defined in a similar way using INCY.

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

SX : REAL array, dimension(N) [in]
> single precision vector with N elements

INCX : INTEGER [in]
> storage spacing between elements of SX

SY : REAL array, dimension(N) [in]
> single precision vector with N elements

INCY : INTEGER [in]
> storage spacing between elements of SY
