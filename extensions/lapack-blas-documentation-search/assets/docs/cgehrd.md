```fortran
subroutine cgehrd (
        integer n,
        integer ilo,
        integer ihi,
        complex, dimension( lda, * ) a,
        integer lda,
        complex, dimension( * ) tau,
        complex, dimension( * ) work,
        integer lwork,
        integer info
)
```

CGEHRD reduces a complex general matrix A to upper Hessenberg form H by
an unitary similarity transformation:  Q\*\*H \* A \* Q = H .

## Parameters
N : INTEGER [in]
> The order of the matrix A.  N >= 0.

ILO : INTEGER [in]

IHI : INTEGER [in]
> 
> It is assumed that A is already upper triangular in rows
> and columns 1:ILO-1 and IHI+1:N. ILO and IHI are normally
> set by a previous call to CGEBAL; otherwise they should be
> set to 1 and N respectively. See Further Details.
> 1 <= ILO <= IHI <= N, if N > 0; ILO=1 and IHI=0, if N=0.

A : COMPLEX array, dimension (LDA,N) [in,out]
> On entry, the N-by-N general matrix to be reduced.
> On exit, the upper triangle and the first subdiagonal of A
> are overwritten with the upper Hessenberg matrix H, and the
> elements below the first subdiagonal, with the array TAU,
> represent the unitary matrix Q as a product of elementary
> reflectors. See Further Details.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

TAU : COMPLEX array, dimension (N-1) [out]
> The scalar factors of the elementary reflectors (see Further
> Details). Elements 1:ILO-1 and IHI:N-1 of TAU are set to
> zero.

WORK : COMPLEX array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The length of the array WORK.  LWORK >= max(1,N).
> For good performance, LWORK should generally be larger.
> 
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value.
