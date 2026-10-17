```fortran
subroutine dgetsqrhrt (
        integer m,
        integer n,
        integer mb1,
        integer nb1,
        integer nb2,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( ldt, * ) t,
        integer ldt,
        double precision, dimension( * ) work,
        integer lwork,
        integer info
)
```

DGETSQRHRT computes a NB2-sized column blocked QR-factorization
of a real M-by-N matrix A with M >= N,

A = Q \* R.

The routine uses internally a NB1-sized column blocked and MB1-sized
row blocked TSQR-factorization and perfors the reconstruction
of the Householder vectors from the TSQR output. The routine also
converts the R_tsqr factor from the TSQR-factorization output into
the R factor that corresponds to the Householder QR-factorization,

A = Q_tsqr \* R_tsqr = Q \* R.

The output Q and R factors are stored in the same format as in DGEQRT
(Q is in blocked compact WY-representation). See the documentation
of DGEQRT for more details on the format.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrix A. M >= N >= 0.

MB1 : INTEGER [in]
> The row block size to be used in the blocked TSQR.
> MB1 > N.

NB1 : INTEGER [in]
> The column block size to be used in the blocked TSQR.
> N >= NB1 >= 1.

NB2 : INTEGER [in]
> The block size to be used in the blocked QR that is
> output. NB2 >= 1.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> 
> On entry: an M-by-N matrix A.
> 
> On exit:
> a) the elements on and above the diagonal
> of the array contain the N-by-N upper-triangular
> matrix R corresponding to the Householder QR;
> b) the elements below the diagonal represent Q by
> the columns of blocked V (compact WY-representation).

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

T : DOUBLE PRECISION array, dimension (LDT,N)) [out]
> The upper triangular block reflectors stored in compact form
> as a sequence of upper triangular blocks.

LDT : INTEGER [in]
> The leading dimension of the array T.  LDT >= NB2.

WORK : (workspace) DOUBLE PRECISION array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.
> If MIN(M,N) = 0, LWORK >= 1, else
> LWORK >= MAX( 1, LWT + LW1, MAX( LWT+N\*N+LW2, LWT+N\*N+N ) ),
> where
> NUM_ALL_ROW_BLOCKS = CEIL((M-N)/(MB1-N)),
> NB1LOCAL = MIN(NB1,N).
> LWT = NUM_ALL_ROW_BLOCKS \* N \* NB1LOCAL,
> LW1 = NB1LOCAL \* N,
> LW2 = NB1LOCAL \* MAX( NB1LOCAL, ( N - NB1LOCAL ) ).
> 
> If LWORK = -1, then a workspace query is assumed.
> The routine only calculates the optimal size of the WORK
> array, returns this value as the first entry of the WORK
> array, and no error message related to LWORK is issued
> by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
