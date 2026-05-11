```fortran
subroutine slaqz2 (
        logical, intent(in) ilq,
        logical, intent(in) ilz,
        integer, intent(in) k,
        integer, intent(in) istartm,
        integer, intent(in) istopm,
        integer, intent(in) ihi,
        real, dimension( lda, * ) a,
        integer, intent(in) lda,
        real, dimension( ldb, * ) b,
        integer, intent(in) ldb,
        integer, intent(in) nq,
        integer, intent(in) qstart,
        real, dimension( ldq, * ) q,
        integer, intent(in) ldq,
        integer, intent(in) nz,
        integer, intent(in) zstart,
        real, dimension( ldz, * ) z,
        integer, intent(in) ldz
)
```

SLAQZ2 chases a 2x2 shift bulge in a matrix pencil down a single position

## Parameters
ILQ : LOGICAL [in]
> Determines whether or not to update the matrix Q

ILZ : LOGICAL [in]
> Determines whether or not to update the matrix Z

K : INTEGER [in]
> Index indicating the position of the bulge.
> On entry, the bulge is located in
> (A(k+1:k+2,k:k+1),B(k+1:k+2,k:k+1)).
> On exit, the bulge is located in
> (A(k+2:k+3,k+1:k+2),B(k+2:k+3,k+1:k+2)).

ISTARTM : INTEGER [in]

ISTOPM : INTEGER [in]
> Updates to (A,B) are restricted to
> (istartm:k+3,k:istopm). It is assumed
> without checking that istartm <= k+1 and
> k+2 <= istopm

IHI : INTEGER [in]

A : REAL array, dimension (LDA,N) [in,out]

LDA : INTEGER [in]
> The leading dimension of A as declared in
> the calling procedure.

B : REAL array, dimension (LDB,N) [in,out]

LDB : INTEGER [in]
> The leading dimension of B as declared in
> the calling procedure.

NQ : INTEGER [in]
> The order of the matrix Q

QSTART : INTEGER [in]
> Start index of the matrix Q. Rotations are applied
> To columns k+2-qStart:k+4-qStart of Q.

Q : REAL array, dimension (LDQ,NQ) [in,out]

LDQ : INTEGER [in]
> The leading dimension of Q as declared in
> the calling procedure.

NZ : INTEGER [in]
> The order of the matrix Z

ZSTART : INTEGER [in]
> Start index of the matrix Z. Rotations are applied
> To columns k+1-qStart:k+3-qStart of Z.

Z : REAL array, dimension (LDZ,NZ) [in,out]

LDZ : INTEGER [in]
> The leading dimension of Q as declared in
> the calling procedure.
