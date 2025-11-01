```fortran
subroutine zlargv (
        integer n,
        complex*16, dimension( * ) x,
        integer incx,
        complex*16, dimension( * ) y,
        integer incy,
        double precision, dimension( * ) c,
        integer incc
)
```

ZLARGV generates a vector of complex plane rotations with real
cosines, determined by elements of the complex vectors x and y.
For i = 1,2,...,n

(        c(i)   s(i) ) ( x(i) ) = ( r(i) )
( -conjg(s(i))  c(i) ) ( y(i) ) = (   0  )

where c(i)\*\*2 + ABS(s(i))\*\*2 = 1

The following conventions are used (these are the same as in ZLARTG,
but differ from the BLAS1 routine ZROTG):
If y(i)=0, then c(i)=1 and s(i)=0.
If x(i)=0, then c(i)=0 and s(i) is chosen so that r(i) is real.

## Parameters
N : INTEGER [in]
> The number of plane rotations to be generated.

X : COMPLEX\*16 array, dimension (1+(N-1)\*INCX) [in,out]
> On entry, the vector x.
> On exit, x(i) is overwritten by r(i), for i = 1,...,n.

INCX : INTEGER [in]
> The increment between elements of X. INCX > 0.

Y : COMPLEX\*16 array, dimension (1+(N-1)\*INCY) [in,out]
> On entry, the vector y.
> On exit, the sines of the plane rotations.

INCY : INTEGER [in]
> The increment between elements of Y. INCY > 0.

C : DOUBLE PRECISION array, dimension (1+(N-1)\*INCC) [out]
> The cosines of the plane rotations.

INCC : INTEGER [in]
> The increment between elements of C. INCC > 0.
