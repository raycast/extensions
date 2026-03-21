```fortran
real function sdot (
        integer n,
        real, dimension(*) sx,
        integer incx,
        real, dimension(*) sy,
        integer incy
)
```

SDOT forms the dot product of two vectors.
uses unrolled loops for increments equal to one.

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

SX : REAL array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in]

INCX : INTEGER [in]
> storage spacing between elements of SX

SY : REAL array, dimension ( 1 + ( N - 1 )\*abs( INCY ) ) [in]

INCY : INTEGER [in]
> storage spacing between elements of SY
