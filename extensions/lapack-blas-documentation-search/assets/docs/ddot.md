```fortran
double precision function ddot (
        integer n,
        double precision, dimension(*) dx,
        integer incx,
        double precision, dimension(*) dy,
        integer incy
)
```

DDOT forms the dot product of two vectors.
uses unrolled loops for increments equal to one.

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

DX : DOUBLE PRECISION array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in]

INCX : INTEGER [in]
> storage spacing between elements of DX

DY : DOUBLE PRECISION array, dimension ( 1 + ( N - 1 )\*abs( INCY ) ) [in]

INCY : INTEGER [in]
> storage spacing between elements of DY
