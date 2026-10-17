```fortran
subroutine dorghr (
        integer n,
        integer ilo,
        integer ihi,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( * ) tau,
        double precision, dimension( * ) work,
        integer lwork,
        integer info
)
```

DORGHR generates a real orthogonal matrix Q which is defined as the
product of IHI-ILO elementary reflectors of order N, as returned by
DGEHRD:

Q = H(ilo) H(ilo+1) . . . H(ihi-1).

## Parameters
N : INTEGER [in]
> The order of the matrix Q. N >= 0.

ILO : INTEGER [in]

IHI : INTEGER [in]
> 
> ILO and IHI must have the same values as in the previous call
> of DGEHRD. Q is equal to the unit matrix except in the
> submatrix Q(ilo+1:ihi,ilo+1:ihi).
> 1 <= ILO <= IHI <= N, if N > 0; ILO=1 and IHI=0, if N=0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> On entry, the vectors which define the elementary reflectors,
> as returned by DGEHRD.
> On exit, the N-by-N orthogonal matrix Q.

LDA : INTEGER [in]
> The leading dimension of the array A. LDA >= max(1,N).

TAU : DOUBLE PRECISION array, dimension (N-1) [in]
> TAU(i) must contain the scalar factor of the elementary
> reflector H(i), as returned by DGEHRD.

WORK : DOUBLE PRECISION array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK. LWORK >= IHI-ILO.
> For optimum performance LWORK >= (IHI-ILO)\*NB, where NB is
> the optimal blocksize.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
