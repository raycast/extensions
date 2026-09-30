```fortran
subroutine scopy (
        integer n,
        real, dimension(*) sx,
        integer incx,
        real, dimension(*) sy,
        integer incy
)
```

SCOPY copies a vector, x, to a vector, y.
uses unrolled loops for increments equal to 1.

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

SX : REAL array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in]

INCX : INTEGER [in]
> storage spacing between elements of SX

SY : REAL array, dimension ( 1 + ( N - 1 )\*abs( INCY ) ) [out]

INCY : INTEGER [in]
> storage spacing between elements of SY
