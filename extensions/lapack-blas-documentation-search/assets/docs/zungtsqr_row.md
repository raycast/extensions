```fortran
subroutine zungtsqr_row (
        integer m,
        integer n,
        integer mb,
        integer nb,
        complex*16, dimension( lda, * ) a,
        integer lda,
        complex*16, dimension( ldt, * ) t,
        integer ldt,
        complex*16, dimension( * ) work,
        integer lwork,
        integer info
)
```

ZUNGTSQR_ROW generates an M-by-N complex matrix Q_out with
orthonormal columns from the output of ZLATSQR. These N orthonormal
columns are the first N columns of a product of complex unitary
matrices Q(k)_in of order M, which are returned by ZLATSQR in
a special format.

Q_out = first_N_columns_of( Q(1)_in \* Q(2)_in \* ... \* Q(k)_in ).

The input matrices Q(k)_in are stored in row and column blocks in A.
See the documentation of ZLATSQR for more details on the format of
Q(k)_in, where each Q(k)_in is represented by block Householder
transformations. This routine calls an auxiliary routine ZLARFB_GETT,
where the computation is performed on each individual block. The
algorithm first sweeps NB-sized column blocks from the right to left
starting in the bottom row block and continues to the top row block
(hence _ROW in the routine name). This sweep is in reverse order of
the order in which ZLATSQR generates the output blocks.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrix A. M >= N >= 0.

MB : INTEGER [in]
> The row block size used by ZLATSQR to return
> arrays A and T. MB > N.
> (Note that if MB > M, then M is used instead of MB
> as the row block size).

NB : INTEGER [in]
> The column block size used by ZLATSQR to return
> arrays A and T. NB >= 1.
> (Note that if NB > N, then N is used instead of NB
> as the column block size).

A : COMPLEX\*16 array, dimension (LDA,N) [in,out]
> 
> On entry:
> 
> The elements on and above the diagonal are not used as
> input. The elements below the diagonal represent the unit
> lower-trapezoidal blocked matrix V computed by ZLATSQR
> that defines the input matrices Q_in(k) (ones on the
> diagonal are not stored). See ZLATSQR for more details.
> 
> On exit:
> 
> The array A contains an M-by-N orthonormal matrix Q_out,
> i.e the columns of A are orthogonal unit vectors.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,M).

T : COMPLEX\*16 array, [in]
> dimension (LDT, N \* NIRB)
> where NIRB = Number_of_input_row_blocks
> = MAX( 1, CEIL((M-N)/(MB-N)) )
> Let NICB = Number_of_input_col_blocks
> = CEIL(N/NB)
> 
> The upper-triangular block reflectors used to define the
> input matrices Q_in(k), k=(1:NIRB\*NICB). The block
> reflectors are stored in compact form in NIRB block
> reflector sequences. Each of the NIRB block reflector
> sequences is stored in a larger NB-by-N column block of T
> and consists of NICB smaller NB-by-NB upper-triangular
> column blocks. See ZLATSQR for more details on the format
> of T.

LDT : INTEGER [in]
> The leading dimension of the array T.
> LDT >= max(1,min(NB,N)).

WORK : (workspace) COMPLEX\*16 array, dimension (MAX(1,LWORK)) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK.
> LWORK >= NBLOCAL \* MAX(NBLOCAL,(N-NBLOCAL)),
> where NBLOCAL=MIN(NB,N).
> If LWORK = -1, then a workspace query is assumed.
> The routine only calculates the optimal size of the WORK
> array, returns this value as the first entry of the WORK
> array, and no error message related to LWORK is issued
> by XERBLA.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
